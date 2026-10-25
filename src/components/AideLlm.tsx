import { useState } from 'react'
import { analyserReponse, construirePrompt, type ReponseLlm } from '../lib/llm'
import type { PieceEntree } from '../shared/pieces'

const bouton =
  'inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium disabled:opacity-50 dark:border-slate-700'
const zone =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'

/** Étape 2 : prompt à copier vers Claude, puis JSON collé en retour. */
export default function AideLlm({
  form,
  lien,
  ouvert,
  onReponse,
}: {
  form: PieceEntree
  lien: string
  ouvert: boolean
  onReponse: (reponse: ReponseLlm) => void
}) {
  const [texteFiche, setTexteFiche] = useState('')
  const [collage, setCollage] = useState('')
  const [copie, setCopie] = useState(false)
  const [promptVisible, setPromptVisible] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  async function copier() {
    const prompt = construirePrompt({ type: form.type, lien, nom: form.nom, marque: form.marque, texteFiche })
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

        <details>
          <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
            Le lien ne passe pas ? Colle le texte de la fiche produit
          </summary>
          <textarea
            value={texteFiche}
            onChange={(e) => setTexteFiche(e.target.value)}
            rows={5}
            placeholder="Texte copié depuis la page produit (composition, caractéristiques…)"
            className={`${zone} mt-2`}
          />
        </details>

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
