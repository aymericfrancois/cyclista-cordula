import { Hono } from 'hono'
import type { Env } from './env'

const TAILLE_MAX = 10 * 1024 * 1024

/** https uniquement, ni localhost ni adresse IP : le Worker ne doit pas servir de relais vers autre chose que des sites publics. */
export function urlDistanteValide(brut: string | undefined): URL | null {
  if (!brut || !URL.canParse(brut)) return null
  const url = new URL(brut)
  const hote = url.hostname
  if (url.protocol !== 'https:') return null
  if (hote === 'localhost' || hote.endsWith('.local') || hote.endsWith('.internal')) return null
  if (/^[\d.]+$/.test(hote) || hote.includes(':')) return null
  return url
}

/**
 * Récupère une image en ligne pour le navigateur (qui ne peut pas la lire lui-même : CORS).
 * Le navigateur la redimensionne et la convertit ensuite en WebP comme n'importe quelle photo.
 */
export const distant = new Hono<{ Bindings: Env }>()

distant.get('/', async (c) => {
  const url = urlDistanteValide(c.req.query('url'))
  if (!url) return c.json({ erreur: 'Lien invalide : une adresse https vers l’image est attendue' }, 400)

  let reponse: Response
  try {
    reponse = await fetch(url, {
      headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0 (compatible; CyclistaCordula)' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return c.json({ erreur: 'Le site n’a pas répondu' }, 502)
  }
  if (!reponse.ok) return c.json({ erreur: `Le site a refusé (${reponse.status})` }, 502)

  const type = (reponse.headers.get('Content-Type') ?? '').split(';')[0]!.trim().toLowerCase()
  // SVG exclu : il peut contenir des scripts.
  if (!type.startsWith('image/') || type === 'image/svg+xml') {
    return c.json({ erreur: 'Ce lien ne mène pas à une image (copie « l’adresse de l’image »)' }, 415)
  }
  if (Number(reponse.headers.get('Content-Length') ?? 0) > TAILLE_MAX || !reponse.body) {
    return c.json({ erreur: 'Image trop lourde (10 Mo max)' }, 413)
  }

  const lecteur = reponse.body.getReader()
  const morceaux: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    total += value.byteLength
    if (total > TAILLE_MAX) {
      await lecteur.cancel()
      return c.json({ erreur: 'Image trop lourde (10 Mo max)' }, 413)
    }
    morceaux.push(value)
  }
  const corps = new Uint8Array(total)
  let decalage = 0
  for (const m of morceaux) {
    corps.set(m, decalage)
    decalage += m.byteLength
  }
  return new Response(corps, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } })
})
