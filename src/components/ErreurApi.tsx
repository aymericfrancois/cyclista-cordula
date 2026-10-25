/**
 * Le service worker sert le site sans repasser par Cloudflare Access.
 * Quand la session expire, seul un passage par /api/connexion relance le login.
 */
export default function ErreurApi({ message }: { message: string }) {
  return (
    <div className="mt-2 text-sm text-red-600">
      <p>API en erreur : {message}</p>
      <p className="mt-1">
        Session expirée ?{' '}
        <a href="/api/connexion" className="font-medium underline">
          Se reconnecter
        </a>
      </p>
    </div>
  )
}
