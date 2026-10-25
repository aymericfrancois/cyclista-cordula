import { useEffect, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ErreurApi from '../components/ErreurApi'
import Indice from '../components/Indice'
import AjoutImage from '../components/AjoutImage'
import { compresserEnWebp, imageDeLEvenement } from '../lib/image'
import {
  ajouterPhoto,
  creerPiece,
  definirImagePropre,
  lirePiece,
  modifierPiece,
  supprimerImagePropre,
  supprimerPhoto,
  supprimerPiece,
  urlImage,
} from '../lib/pieces'
import {
  COMPRESSIBLE_PAR_TYPE,
  ETATS,
  LIBELLE_ETAT,
  LIBELLE_TYPE,
  LIBELLE_ZONE,
  MAX_PHOTOS,
  TYPES,
  ZONES,
  ZONES_PAR_TYPE,
  schemaPieceEntree,
  type Piece,
  type PieceEntree,
  type TypePiece,
  type Zone,
} from '../shared/pieces'

type Fichier = { fichier: File; apercu: string }

const champ =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900'
const bouton =
  'inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 px-4 text-sm font-medium dark:border-slate-700'

function vide(): PieceEntree {
  return {
    sport: 'velo',
    nom: '',
    marque: '',
    lien: null,
    type: 'maillot_mc',
    zones: [...ZONES_PAR_TYPE.maillot_mc],
    composition: '',
    grammage: '',
    chaleur: 0,
    coupeVent: 0,
    impermeabilite: 0,
    respirabilite: 0,
    compressible: COMPRESSIBLE_PAR_TYPE.maillot_mc,
    etat: 'dispo',
  }
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

function Section({ titre, children, onPaste }: { titre: string; children: ReactNode; onPaste?: (e: ClipboardEvent<HTMLElement>) => void }) {
  return (
    <section onPaste={onPaste} className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h2 className="font-medium">{titre}</h2>
      {children}
    </section>
  )
}

export default function PieceFormulaire() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [piece, setPiece] = useState<Piece | null>(null)
  const [form, setForm] = useState<PieceEntree>(vide)
  const [lien, setLien] = useState('')
  const [chargement, setChargement] = useState(id !== undefined)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Modifications d'images mises en attente jusqu'à « Enregistrer ».
  const [photosAjoutees, setPhotosAjoutees] = useState<Fichier[]>([])
  const [photosRetirees, setPhotosRetirees] = useState<string[]>([])
  const [propreAjoutee, setPropreAjoutee] = useState<Fichier | null>(null)
  const [propreRetiree, setPropreRetiree] = useState(false)

  useEffect(() => {
    if (!id) return
    lirePiece(id)
      .then((p) => {
        setPiece(p)
        setForm(schemaPieceEntree.parse(p))
        setLien(p.lien ?? '')
      })
      .catch((e: unknown) => setErreur(message(e)))
      .finally(() => setChargement(false))
  }, [id])

  const modifier = <K extends keyof PieceEntree>(cle: K, valeur: PieceEntree[K]) =>
    setForm((f) => ({ ...f, [cle]: valeur }))

  function changerType(type: TypePiece) {
    setForm((f) => ({ ...f, type, zones: [...ZONES_PAR_TYPE[type]], compressible: COMPRESSIBLE_PAR_TYPE[type] }))
  }

  function basculerZone(zone: Zone) {
    setForm((f) => ({ ...f, zones: f.zones.includes(zone) ? f.zones.filter((z) => z !== zone) : [...f.zones, zone] }))
  }

  const photosGardees = (piece?.photos ?? []).filter((p) => !photosRetirees.includes(p))
  const placesLibres = MAX_PHOTOS - photosGardees.length - photosAjoutees.length

  function ajouterPhotos(fichiers: File[]) {
    const nouveaux = fichiers.slice(0, placesLibres).map((fichier) => ({ fichier, apercu: URL.createObjectURL(fichier) }))
    setPhotosAjoutees((l) => [...l, ...nouveaux])
  }

  function choisirPropre(fichier: File) {
    if (propreAjoutee) URL.revokeObjectURL(propreAjoutee.apercu)
    setPropreAjoutee({ fichier, apercu: URL.createObjectURL(fichier) })
    setPropreRetiree(false)
  }

  // Ctrl+V n'importe où dans la page : l'image collée devient une photo.
  // Le bloc « Image propre » intercepte son propre collage avant (stopPropagation).
  useEffect(() => {
    function surColler(e: globalThis.ClipboardEvent) {
      const fichier = imageDeLEvenement(e)
      if (!fichier || placesLibres <= 0) return
      e.preventDefault()
      ajouterPhotos([fichier])
    }
    document.addEventListener('paste', surColler)
    return () => document.removeEventListener('paste', surColler)
  })

  function collerSurPropre(e: ClipboardEvent<HTMLElement>) {
    const fichier = imageDeLEvenement(e)
    if (!fichier) return
    e.preventDefault()
    e.stopPropagation()
    choisirPropre(fichier)
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    const analyse = schemaPieceEntree.safeParse({ ...form, lien: lien.trim() || null })
    if (!analyse.success) {
      const premier = analyse.error.issues[0]
      setErreur(`Champ invalide (${premier?.path.join('.')}) : ${premier?.message}`)
      return
    }
    setEnCours(true)
    // Les éléments déjà envoyés sont retirés de la liste : un second essai ne les renvoie pas.
    const restantesPhotos = [...photosAjoutees]
    const retirees = [...photosRetirees]
    let propre = propreAjoutee
    try {
      let courante = piece
      if (courante) courante = await modifierPiece(courante.id, analyse.data)
      else {
        courante = await creerPiece(analyse.data)
        setPiece(courante)
      }
      while (retirees.length > 0) {
        await supprimerPhoto(courante.id, retirees[0]!)
        retirees.shift()
      }
      while (restantesPhotos.length > 0) {
        courante = await ajouterPhoto(courante.id, await compresserEnWebp(restantesPhotos[0]!.fichier))
        restantesPhotos.shift()
      }
      if (propre) {
        courante = await definirImagePropre(courante.id, await compresserEnWebp(propre.fichier))
        propre = null
      } else if (propreRetiree) {
        courante = await supprimerImagePropre(courante.id)
      }
      navigate('/garde-robe')
    } catch (err) {
      setErreur(message(err))
    } finally {
      setPhotosAjoutees(restantesPhotos)
      setPhotosRetirees(retirees)
      setPropreAjoutee(propre)
      setEnCours(false)
    }
  }

  async function supprimer() {
    if (!piece || !confirm(`Supprimer « ${piece.nom} » définitivement ?`)) return
    try {
      await supprimerPiece(piece.id)
      navigate('/garde-robe')
    } catch (err) {
      setErreur(message(err))
    }
  }

  if (chargement) return <p className="text-slate-500">Chargement…</p>

  const propreAffichee = propreAjoutee?.apercu ?? (piece?.imagePropre && !propreRetiree ? urlImage(piece, piece.imagePropre) : null)

  return (
    <form onSubmit={enregistrer} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{piece ? 'Modifier la pièce' : 'Nouvelle pièce'}</h1>
        <Link to="/garde-robe" className="text-sm text-slate-500 underline">
          Annuler
        </Link>
      </div>

      <Section titre="Photos">
        <div className="grid grid-cols-3 gap-2">
          {photosGardees.map((nom) => (
            <Vignette key={nom} src={urlImage(piece!, nom)} onRetirer={() => setPhotosRetirees((l) => [...l, nom])} />
          ))}
          {photosAjoutees.map((p) => (
            <Vignette
              key={p.apercu}
              src={p.apercu}
              onRetirer={() => {
                URL.revokeObjectURL(p.apercu)
                setPhotosAjoutees((l) => l.filter((x) => x !== p))
              }}
            />
          ))}
        </div>
        {placesLibres > 0 && <AjoutImage onFichier={(f) => ajouterPhotos([f])} />}
        {placesLibres > 0 ? (
          <div className="flex flex-wrap gap-2">
            <label className={bouton}>
              Prendre une photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { ajouterPhotos([...(e.target.files ?? [])]); e.target.value = '' }} />
            </label>
            <label className={bouton}>
              Choisir un fichier
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { ajouterPhotos([...(e.target.files ?? [])]); e.target.value = '' }} />
            </label>
          </div>
        ) : (
          <p className="text-xs text-slate-500">{MAX_PHOTOS} photos maximum.</p>
        )}
      </Section>

      <Section titre="Image propre" onPaste={collerSurPropre}>
        <p className="text-xs text-slate-500">PNG généré avec Flux. Affichée à la place de la photo dans la liste.</p>
        {propreAffichee && (
          <Vignette
            src={propreAffichee}
            grande
            onRetirer={() => {
              if (propreAjoutee) URL.revokeObjectURL(propreAjoutee.apercu)
              setPropreAjoutee(null)
              setPropreRetiree(true)
            }}
          />
        )}
        <label className={bouton}>
          {propreAffichee ? 'Remplacer' : 'Choisir le fichier'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) choisirPropre(f); e.target.value = '' }} />
        </label>
        <AjoutImage onFichier={choisirPropre} />
      </Section>

      <Section titre="Pièce">
        <label className="block text-sm font-medium">
          Type
          <select className={champ} value={form.type} onChange={(e) => changerType(e.target.value as TypePiece)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {LIBELLE_TYPE[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Nom
          <input required className={champ} value={form.nom} maxLength={120} onChange={(e) => modifier('nom', e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Marque
          <input className={champ} value={form.marque} maxLength={80} onChange={(e) => modifier('marque', e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Lien produit (optionnel)
          <input type="url" inputMode="url" className={champ} value={lien} placeholder="https://…" onChange={(e) => setLien(e.target.value)} />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Zones couvertes</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {ZONES.map((z) => (
              <label
                key={z}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                  form.zones.includes(z) ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                <input type="checkbox" className="sr-only" checked={form.zones.includes(z)} onChange={() => basculerZone(z)} />
                {LIBELLE_ZONE[z]}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section titre="Matière">
        <label className="block text-sm font-medium">
          Composition
          <input className={champ} value={form.composition} maxLength={300} placeholder="ex. 85 % polyester, 15 % élasthanne" onChange={(e) => modifier('composition', e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Grammage
          <input className={champ} value={form.grammage} maxLength={100} placeholder="ex. 180 g/m²" onChange={(e) => modifier('grammage', e.target.value)} />
        </label>
      </Section>

      <Section titre="Indices (0 à 5)">
        <Indice libelle="Chaleur" aide="0 = aucune isolation, 5 = très chaud (hiver)" valeur={form.chaleur} onChange={(v) => modifier('chaleur', v)} />
        <Indice libelle="Coupe-vent" aide="0 = laisse passer, 5 = bloque totalement" valeur={form.coupeVent} onChange={(v) => modifier('coupeVent', v)} />
        <Indice libelle="Imperméabilité" aide="0 = absorbe l’eau, 5 = étanche" valeur={form.impermeabilite} onChange={(v) => modifier('impermeabilite', v)} />
        <Indice libelle="Respirabilité" aide="0 = évacue mal la transpiration, 5 = très respirant" valeur={form.respirabilite} onChange={(v) => modifier('respirabilite', v)} />
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-sky-600" checked={form.compressible} onChange={(e) => modifier('compressible', e.target.checked)} />
          Compressible, tient dans une poche
        </label>
      </Section>

      <Section titre="État">
        <div className="flex gap-2">
          {ETATS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => modifier('etat', e)}
              className={`min-h-11 flex-1 rounded-lg border text-sm ${
                form.etat === e ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {LIBELLE_ETAT[e]}
            </button>
          ))}
        </div>
      </Section>

      {erreur && <ErreurApi message={erreur} />}

      <button type="submit" disabled={enCours} className="min-h-12 w-full rounded-lg bg-sky-600 font-medium text-white disabled:opacity-50">
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {piece && (
        <button type="button" onClick={supprimer} className="min-h-11 w-full text-sm text-red-600 underline">
          Supprimer cette pièce
        </button>
      )}
    </form>
  )
}

function Vignette({ src, onRetirer, grande = false }: { src: string; onRetirer: () => void; grande?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 ${grande ? 'w-40' : ''}`}>
      <img src={src} alt="" className="aspect-square w-full object-contain" />
      <button
        type="button"
        onClick={onRetirer}
        aria-label="Retirer l’image"
        className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
      >
        ×
      </button>
    </div>
  )
}
