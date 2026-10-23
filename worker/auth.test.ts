import { describe, expect, it } from 'vitest'
import { identifier } from './auth'
import type { Env } from './env'

const envVide = { ACCESS_TEAM_DOMAIN: '', ACCESS_AUD: '' } as Env
const requete = (url: string, entetes: Record<string, string> = {}) => new Request(url, { headers: entetes })

describe('identifier', () => {
  it('refuse tout (503) quand Access n’est pas configuré', async () => {
    const r = await identifier(requete('https://cyclista.workers.dev/api/me'), envVide)
    expect(r).toMatchObject({ ok: false, statut: 503 })
  })

  it('refuse (401) une requête sans jeton quand Access est configuré', async () => {
    const env = { ...envVide, ACCESS_TEAM_DOMAIN: 'equipe.cloudflareaccess.com', ACCESS_AUD: 'abc' } as Env
    const r = await identifier(requete('https://cyclista.workers.dev/api/me'), env)
    expect(r).toMatchObject({ ok: false, statut: 401 })
  })

  it('accepte l’e-mail de dev uniquement sur localhost', async () => {
    const env = { ...envVide, DEV_EMAIL: 'moi@exemple.fr' } as Env
    expect(await identifier(requete('http://localhost:8787/api/me'), env)).toEqual({ ok: true, email: 'moi@exemple.fr' })
    const enLigne = await identifier(requete('https://cyclista.workers.dev/api/me'), env)
    expect(enLigne.ok).toBe(false)
  })
})
