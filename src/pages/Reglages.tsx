import { useEffect, useState } from 'react'
import { appeler, schemaMoi, schemaSante } from '../lib/api'

type Etat = { email: string; base: boolean; images: boolean } | 'erreur' | null

export default function Reglages() {
  const [etat, setEtat] = useState<Etat>(null)

  useEffect(() => {
    Promise.all([appeler('/me', schemaMoi), appeler('/sante', schemaSante)])
      .then(([moi, sante]) => setEtat({ email: moi.email, ...sante }))
      .catch(() => setEtat('erreur'))
  }, [])

  return (
    <>
      <h1 className="text-xl font-semibold">Réglages</h1>
      <section className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="font-medium">Connexion et services</h2>
        {etat === null && <p className="mt-2 text-slate-500">Vérification…</p>}
        {etat === 'erreur' && <p className="mt-2 text-red-600">API injoignable ou accès refusé.</p>}
        {etat && etat !== 'erreur' && (
          <ul className="mt-2 space-y-1 text-sm">
            <li>Connecté : {etat.email}</li>
            <li>Base de données : {etat.base ? 'OK' : 'en erreur'}</li>
            <li>Stockage d’images : {etat.images ? 'OK' : 'en erreur'}</li>
          </ul>
        )}
      </section>
    </>
  )
}
