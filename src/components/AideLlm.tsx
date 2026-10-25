import { useState } from 'react'
import { memoriserSiteAColler, siteAColler } from '../lib/domaines'
import { analyserReponse, construirePrompt, MAX_TEXTE_FICHE, type ReponseLlm } from '../lib/llm'
import type { PieceEntree } from '../shared/pieces'

const bouton =
  'inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium disabled:opacity-50 dark:border-slate-700'
const zone =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'

const lienValide = (lien: string) => /^https?:\/\//i.test(lien.trim()) && URL.canParse(lien.trim())

/** Étape 2 : prompt à copier vers Claude, puis JSON collé en retour. */
export default function AideLlm({
  form,
  lien,
  ouvert,
  onNotes,
  onReponse,
}: {
  form: PieceEntree
  lien: string
  ouvert: boolean
  onNotes: (notes: string) => void
  onReponse: (reponse: ReponseLlm) => void
}) {
  const [texteFiche, setTexteFiche] = useState('')
  const [collage, setCollage] = useState('')
  const [copie, setCopie] = useState(false)
  const [promptVisible, setPromptVisible] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  const illisible = lienValide(lien) && siteAColler(lien)
  const trop = texteFiche.trim().length > MAX_TEXTE_FICHE

  async function collerPage() {
    try {
      setTexteFiche(await navigator.clipboard.readText())
    } catch {
      setMessage({ ok: false, texte: 'Presse-papiers inaccessible : colle le texte à la main dans la zone.' })
    }
  }

  async function copier() {
    const prompt = construirePrompt({
      type: form.type,
      lien,
      nom: form.nom,
      marque: form.marque,
      texteFiche,
      notes: form.notes,
      actuel: form,
    })
    // Un texte collé avec un lien : ce site sera proposé en « coller la page » la prochaine fois.
    if (texteFiche.trim() && lienValide(lien)) memoriserSiteAColler(lien.trim())
    try {
      await navigator.clipboard.writeText(prompt)
      setCopie(true)
      setPromptVisible(null)
      setTimeout(() => setCopie(false), 3000)
    } catch {
      // Presse-papiers refusé : on affiche le texte à copier à la main.
      setPromptVisible(prompt)
    }
  }

  function remplir() {
    const resultat = analyserReponse(collage)
    if (!resultat.ok) return setMessage({ ok: false, texte: resultat.erreur })
    onReponse(resultat.reponse)
    setCollage('')
    setMessage({ ok: true, texte: 'Formulaire rempli. Vérifie les indices avant d’enregistrer.' })
  }

  return (
    <details open={ouvert} className="rounded-lg border border-slate-200 dark:border-slate-800">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium">Remplir avec Claude</summary>
      <div className="space-y-3 p-4 pt-0">
        <p className="text-xs text-slate-500">
          1. Copie le prompt. 2. Colle-le dans Claude. 3. Recopie sa réponse ici. Le type et le lien viennent du formulaire.
        </p>

        <details open={illisible || texteFiche !== ''}>
          <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
            Contenu de la page produit {texteFiche.trim() ? '✓' : '(site qui bloque Claude ?)'}
          </summary>
          <div className="mt-2 space-y-2">
            {illisible && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Claude ne sait pas lire ce site : colle le contenu de la page, c’est plus rapide.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Sur la page : Ctrl+A puis Ctrl+C, puis « Coller le contenu copié ». Claude n’aura alors plus à ouvrir le lien.
            </p>
            <div className="flex flex-wrap gap-2">
              {lienValide(lien) ? (
                <a href={lien.trim()} target="_blank" rel="noopener noreferrer" className={bouton}>
                  Ouvrir le lien ↗
                </a>
              ) : (
                <span className={`${bouton} opacity-50`}>Ouvrir le lien ↗</span>
              )}
              <button type="button" onClick={collerPage} className={bouton}>
                Coller le contenu copié
              </button>
            </div>
            <textarea
              value={texteFiche}
              onChange={(e) => setTexteFiche(e.target.value)}
              rows={4}
              placeholder="Texte de la page produit"
              className={zone}
            />
            {texteFiche.trim() && (
              <p className={`text-xs ${trop ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>
                {texteFiche.trim().length.toLocaleString('fr-FR')} caractères
                {trop && ` : seuls les ${MAX_TEXTE_FICHE.toLocaleString('fr-FR')} premiers seront envoyés`}
              </p>
            )}
          </div>
        </details>

        <label className="block text-sm font-medium">
          Mes retours d’usage (optionnel)
          <textarea
            value={form.notes}
            onChange={(e) => onNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="ex. je transpire beaucoup dedans, plus chaud que prévu"
            className={`${zone} mt-1 font-normal`}
          />
        </label>

        <button type="button" onClick={copier} className={bouton}>
          {copie ? 'Prompt copié ✓' : '1. Copier le prompt'}
        </button>
        {promptVisible && (
          <textarea readOnly value={promptVisible} rows={6} onFocus={(e) => e.currentTarget.select()} className={zone} />
        )}

        <textarea
          value={collage}
          onChange={(e) => setCollage(e.target.value)}
          rows={4}
          placeholder="2. Colle ici la réponse de Claude (le JSON)"
          className={zone}
        />
        <button type="button" onClick={remplir} disabled={!collage.trim()} className={bouton}>
          3. Remplir le formulaire
        </button>
        {message && <p className={`text-sm ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>{message.texte}</p>}
      </div>
    </details>
  )
}
