import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Env } from './env'

export type Identite = { ok: true; email: string } | { ok: false; statut: 401 | 503; message: string }

const jeuxDeCles = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function cles(equipe: string) {
  let jeu = jeuxDeCles.get(equipe)
  if (!jeu) {
    jeu = createRemoteJWKSet(new URL(`https://${equipe}/cdn-cgi/access/certs`))
    jeuxDeCles.set(equipe, jeu)
  }
  return jeu
}

/**
 * Vérifie que la requête vient bien de Cloudflare Access.
 * Refuse tout si Access n'est pas configuré : mieux vaut une API fermée qu'ouverte.
 */
export async function identifier(request: Request, env: Env): Promise<Identite> {
  const { hostname } = new URL(request.url)
  if (env.DEV_EMAIL && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return { ok: true, email: env.DEV_EMAIL }
  }

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { ok: false, statut: 503, message: 'Cloudflare Access non configuré' }
  }

  const jeton = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!jeton) return { ok: false, statut: 401, message: 'Non authentifié' }

  try {
    const { payload } = await jwtVerify(jeton, cles(env.ACCESS_TEAM_DOMAIN), {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
      audience: env.ACCESS_AUD,
    })
    if (typeof payload.email !== 'string') return { ok: false, statut: 401, message: 'Jeton sans e-mail' }
    return { ok: true, email: payload.email }
  } catch {
    return { ok: false, statut: 401, message: 'Jeton Access invalide' }
  }
}
