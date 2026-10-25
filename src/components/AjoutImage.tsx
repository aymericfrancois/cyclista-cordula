import { useState } from 'react'
import { imageDuPressePapiers, telechargerImage } from '../lib/image'

const bouton =
  'inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium disabled:opacity-50 dark:border-slate-700'

/** Ajouter une image depuis un lien ou le presse-papiers (Ctrl+V fonctionne aussi dans le champ du lien). */
export default function AjoutImage({ onFichier }: { onFichier: (fichier: File) => void }) {
  const [lien, setLien] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function executer(obtenir: () => Promise<File>) {
    setErreur(null)
    setEnCours(true)
    try {
      onFichier(await obtenir())
      setLien('')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          placeholder="Lien de l’image (https://…)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button type="button" disabled={enCours || !lien.trim()} onClick={() => executer(() => telechargerImage(lien))} className={bouton}>
          Ajouter
        </button>
      </div>
      <button type="button" disabled={enCours} onClick={() => executer(imageDuPressePapiers)} className={bouton}>
        Coller l’image copiée
      </button>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
    </div>
  )
}
