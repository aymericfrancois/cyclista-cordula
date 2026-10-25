import { Hono } from 'hono'
import { identifier } from './auth'
import type { Env } from './env'
import { images, pieces } from './pieces'

type Variables = { email: string }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Tout /api exige une identité Access valide.
app.use('/api/*', async (c, next) => {
  const identite = await identifier(c.req.raw, c.env)
  if (!identite.ok) return c.json({ erreur: identite.message }, identite.statut)
  c.set('email', identite.email)
  await next()
})

// Point d'entrée pour se reconnecter : Access impose le login, puis on revient à l'accueil.
app.get('/api/connexion', (c) => c.redirect('/'))

app.get('/api/me', (c) => c.json({ email: c.get('email') }))

// Vérifie que la base D1 et le stockage R2 répondent.
app.get('/api/sante', async (c) => {
  const [base, images] = await Promise.allSettled([
    c.env.DB.prepare('SELECT 1 AS ok').first(),
    c.env.IMAGES.list({ limit: 1 }),
  ])
  return c.json({ base: base.status === 'fulfilled', images: images.status === 'fulfilled' })
})

app.route('/api/pieces', pieces)
app.route('/api/images', images)

app.notFound((c) => c.json({ erreur: 'Introuvable' }, 404))

export default app
