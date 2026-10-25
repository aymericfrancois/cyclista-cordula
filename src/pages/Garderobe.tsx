import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CartePiece from '../components/CartePiece'
import ErreurApi from '../components/ErreurApi'
import { changerEtat, listerPieces } from '../lib/pieces'
import { ETAT_SUIVANT, LIBELLE_ZONE, ZONES, type Piece, type Zone } from '../shared/pieces'

export default function Garderobe() {
  const [pieces, setPieces] = useState<Piece[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)

  useEffect(() => {
    listerPieces()
      .then(setPieces)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : String(e)))
  }, [])

  async function basculer(piece: Piece) {
    const etat = ETAT_SUIVANT[piece.etat]
    const remplacer = (e: Piece['etat']) =>
      setPieces((liste) => liste?.map((p) => (p.id === piece.id ? { ...p, etat: e } : p)) ?? null)
    remplacer(etat)
    try {
      await changerEtat(piece.id, etat)
    } catch (e) {
      remplacer(piece.etat)
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }

  const visibles = pieces?.filter((p) => zone === null || p.zones.includes(zone)) ?? []

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Garde-robe</h1>
        <Link to="/garde-robe/nouvelle" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white">
          Ajouter
        </Link>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {[null, ...ZONES].map((z) => (
          <button
            key={z ?? 'toutes'}
            type="button"
            onClick={() => setZone(z)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              zone === z
                ? 'border-sky-600 bg-sky-600 text-white'
                : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {z ? LIBELLE_ZONE[z] : 'Toutes'}
          </button>
        ))}
      </div>

      {erreur && <ErreurApi message={erreur} />}
      {pieces === null && !erreur && <p className="mt-4 text-slate-500">Chargement…</p>}
      {pieces && visibles.length === 0 && (
        <p className="mt-4 text-slate-500">
          {pieces.length === 0 ? 'Ta garde-robe est vide. Ajoute ta première pièce.' : 'Aucune pièce dans cette zone.'}
        </p>
      )}
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {visibles.map((p) => (
          <CartePiece key={p.id} piece={p} onEtat={() => basculer(p)} />
        ))}
      </ul>
    </>
  )
}
