import { Link } from 'react-router-dom'
import { urlImage } from '../lib/pieces'
import { LIBELLE_TYPE, LIBELLE_ZONE, imageAffichee, type Piece } from '../shared/pieces'
import EtatPiece from './EtatPiece'

export default function CartePiece({ piece, onEtat }: { piece: Piece; onEtat: () => void }) {
  const image = imageAffichee(piece)
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${
        piece.etat === 'dispo' ? '' : 'opacity-70'
      }`}
    >
      <Link to={`/garde-robe/${piece.id}`} className="block">
        <div className="aspect-square bg-white">
          {image ? (
            <img src={urlImage(piece, image)} alt={piece.nom} className="size-full object-contain" loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-slate-400">Pas d’image</div>
          )}
        </div>
        <div className="px-3 pt-2">
          <p className="truncate font-medium">{piece.nom}</p>
          <p className="truncate text-xs text-slate-500">
            {[piece.marque, LIBELLE_TYPE[piece.type]].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">{piece.zones.map((z) => LIBELLE_ZONE[z]).join(', ')}</p>
        </div>
      </Link>
      <div className="p-3">
        <EtatPiece etat={piece.etat} onTap={onEtat} />
      </div>
    </li>
  )
}
