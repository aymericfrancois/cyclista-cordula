import { LIBELLE_ETAT, type Etat } from '../shared/pieces'

const COULEURS: Record<Etat, string> = {
  dispo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  sale: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  lavage: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
}

/** Bouton d'état : un tap passe à l'état suivant. */
export default function EtatPiece({ etat, onTap }: { etat: Etat; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`min-h-11 w-full rounded-full px-3 text-sm font-medium ${COULEURS[etat]}`}
    >
      {LIBELLE_ETAT[etat]}
    </button>
  )
}
