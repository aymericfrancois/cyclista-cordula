import { Hono } from 'hono'
import type { Env } from './env'
import { MAX_PHOTOS, schemaEtat, schemaPiece, schemaPieceEntree, type Piece } from '../src/shared/pieces'

type Ligne = {
  id: string
  sport: string
  nom: string
  marque: string
  lien: string | null
  type: string
  zones: string
  composition: string
  grammage: string
  chaleur: number
  coupe_vent: number
  impermeabilite: number
  respirabilite: number
  compressible: number
  notes: string
  etat: string
  photos: string
  image_propre: string | null
  cree_le: string
  maj_le: string
}

const TAILLE_MAX_IMAGE = 5 * 1024 * 1024
const ID = /^[0-9a-f-]{36}$/
const NOM_IMAGE = /^[a-z]+-[0-9a-f-]{36}\.webp$/

const cleR2 = (id: string, nom: string) => `pieces/${id}/${nom}`

function versPiece(l: Ligne): Piece {
  return schemaPiece.parse({
    id: l.id,
    sport: l.sport,
    nom: l.nom,
    marque: l.marque,
    lien: l.lien,
    type: l.type,
    zones: JSON.parse(l.zones),
    composition: l.composition,
    grammage: l.grammage,
    chaleur: l.chaleur,
    coupeVent: l.coupe_vent,
    impermeabilite: l.impermeabilite,
    respirabilite: l.respirabilite,
    compressible: l.compressible === 1,
    notes: l.notes,
    etat: l.etat,
    photos: JSON.parse(l.photos),
    imagePropre: l.image_propre,
    creeLe: l.cree_le,
    majLe: l.maj_le,
  })
}

async function lirePiece(env: Env, id: string): Promise<Piece | null> {
  if (!ID.test(id)) return null
  const ligne = await env.DB.prepare('SELECT * FROM pieces WHERE id = ?').bind(id).first<Ligne>()
  return ligne ? versPiece(ligne) : null
}

/** Vérifie que le corps est bien un WebP de taille raisonnable (signature RIFF....WEBP). */
async function lireWebp(requete: Request): Promise<ArrayBuffer | { erreur: string; statut: 413 | 415 }> {
  if (requete.headers.get('Content-Type') !== 'image/webp') return { erreur: 'WebP attendu', statut: 415 }
  const donnees = await requete.arrayBuffer()
  if (donnees.byteLength > TAILLE_MAX_IMAGE) return { erreur: 'Image trop lourde (5 Mo max)', statut: 413 }
  const t = new Uint8Array(donnees, 0, Math.min(12, donnees.byteLength))
  const signature = new TextDecoder().decode(t.slice(0, 4)) + new TextDecoder().decode(t.slice(8, 12))
  if (signature !== 'RIFFWEBP') return { erreur: 'Fichier WebP invalide', statut: 415 }
  return donnees
}

export const pieces = new Hono<{ Bindings: Env }>()

pieces.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM pieces ORDER BY cree_le DESC').all<Ligne>()
  return c.json(results.map(versPiece))
})

pieces.post('/', async (c) => {
  const corps = schemaPieceEntree.safeParse(await c.req.json().catch(() => null))
  if (!corps.success) return c.json({ erreur: 'Pièce invalide', details: corps.error.issues }, 400)
  const p = corps.data
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO pieces (id, sport, nom, marque, lien, type, zones, composition, grammage,
       chaleur, coupe_vent, impermeabilite, respirabilite, compressible, notes, etat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id, p.sport, p.nom, p.marque, p.lien, p.type, JSON.stringify(p.zones), p.composition, p.grammage,
      p.chaleur, p.coupeVent, p.impermeabilite, p.respirabilite, p.compressible ? 1 : 0, p.notes, p.etat,
    )
    .run()
  return c.json(await lirePiece(c.env, id), 201)
})

pieces.get('/:id', async (c) => {
  const piece = await lirePiece(c.env, c.req.param('id'))
  return piece ? c.json(piece) : c.json({ erreur: 'Pièce introuvable' }, 404)
})

pieces.put('/:id', async (c) => {
  const id = c.req.param('id')
  if (!(await lirePiece(c.env, id))) return c.json({ erreur: 'Pièce introuvable' }, 404)
  const corps = schemaPieceEntree.safeParse(await c.req.json().catch(() => null))
  if (!corps.success) return c.json({ erreur: 'Pièce invalide', details: corps.error.issues }, 400)
  const p = corps.data
  await c.env.DB.prepare(
    `UPDATE pieces SET sport = ?, nom = ?, marque = ?, lien = ?, type = ?, zones = ?, composition = ?,
       grammage = ?, chaleur = ?, coupe_vent = ?, impermeabilite = ?, respirabilite = ?,
       compressible = ?, notes = ?, etat = ?, maj_le = datetime('now')
     WHERE id = ?`,
  )
    .bind(
      p.sport, p.nom, p.marque, p.lien, p.type, JSON.stringify(p.zones), p.composition, p.grammage,
      p.chaleur, p.coupeVent, p.impermeabilite, p.respirabilite, p.compressible ? 1 : 0, p.notes, p.etat, id,
    )
    .run()
  return c.json(await lirePiece(c.env, id))
})

pieces.patch('/:id/etat', async (c) => {
  const id = c.req.param('id')
  const corps = schemaEtat.safeParse(await c.req.json().catch(() => null))
  if (!corps.success) return c.json({ erreur: 'État invalide' }, 400)
  const { meta } = await c.env.DB.prepare("UPDATE pieces SET etat = ?, maj_le = datetime('now') WHERE id = ?")
    .bind(corps.data.etat, id)
    .run()
  if (meta.changes === 0) return c.json({ erreur: 'Pièce introuvable' }, 404)
  return c.json(await lirePiece(c.env, id))
})

pieces.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!(await lirePiece(c.env, id))) return c.json({ erreur: 'Pièce introuvable' }, 404)
  const fichiers = await c.env.IMAGES.list({ prefix: `pieces/${id}/` })
  if (fichiers.objects.length > 0) await c.env.IMAGES.delete(fichiers.objects.map((o) => o.key))
  await c.env.DB.prepare('DELETE FROM pieces WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

pieces.post('/:id/photos', async (c) => {
  const id = c.req.param('id')
  const piece = await lirePiece(c.env, id)
  if (!piece) return c.json({ erreur: 'Pièce introuvable' }, 404)
  if (piece.photos.length >= MAX_PHOTOS) return c.json({ erreur: `${MAX_PHOTOS} photos maximum` }, 409)
  const donnees = await lireWebp(c.req.raw)
  if (!(donnees instanceof ArrayBuffer)) return c.json({ erreur: donnees.erreur }, donnees.statut)
  const nom = `photo-${crypto.randomUUID()}.webp`
  await c.env.IMAGES.put(cleR2(id, nom), donnees, { httpMetadata: { contentType: 'image/webp' } })
  await c.env.DB.prepare("UPDATE pieces SET photos = ?, maj_le = datetime('now') WHERE id = ?")
    .bind(JSON.stringify([...piece.photos, nom]), id)
    .run()
  return c.json(await lirePiece(c.env, id), 201)
})

pieces.delete('/:id/photos/:nom', async (c) => {
  const id = c.req.param('id')
  const nom = c.req.param('nom')
  const piece = await lirePiece(c.env, id)
  if (!piece || !piece.photos.includes(nom)) return c.json({ erreur: 'Photo introuvable' }, 404)
  await c.env.IMAGES.delete(cleR2(id, nom))
  await c.env.DB.prepare("UPDATE pieces SET photos = ?, maj_le = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(piece.photos.filter((p) => p !== nom)), id)
    .run()
  return c.json(await lirePiece(c.env, id))
})

pieces.put('/:id/image-propre', async (c) => {
  const id = c.req.param('id')
  const piece = await lirePiece(c.env, id)
  if (!piece) return c.json({ erreur: 'Pièce introuvable' }, 404)
  const donnees = await lireWebp(c.req.raw)
  if (!(donnees instanceof ArrayBuffer)) return c.json({ erreur: donnees.erreur }, donnees.statut)
  const nom = `propre-${crypto.randomUUID()}.webp`
  await c.env.IMAGES.put(cleR2(id, nom), donnees, { httpMetadata: { contentType: 'image/webp' } })
  await c.env.DB.prepare("UPDATE pieces SET image_propre = ?, maj_le = datetime('now') WHERE id = ?").bind(nom, id).run()
  if (piece.imagePropre) await c.env.IMAGES.delete(cleR2(id, piece.imagePropre))
  return c.json(await lirePiece(c.env, id))
})

pieces.delete('/:id/image-propre', async (c) => {
  const id = c.req.param('id')
  const piece = await lirePiece(c.env, id)
  if (!piece) return c.json({ erreur: 'Pièce introuvable' }, 404)
  if (piece.imagePropre) await c.env.IMAGES.delete(cleR2(id, piece.imagePropre))
  await c.env.DB.prepare("UPDATE pieces SET image_propre = NULL, maj_le = datetime('now') WHERE id = ?").bind(id).run()
  return c.json(await lirePiece(c.env, id))
})

export const images = new Hono<{ Bindings: Env }>()

// Les noms contiennent un identifiant unique : le contenu ne change jamais, cache longue durée.
images.get('/:id/:nom', async (c) => {
  const { id, nom } = c.req.param()
  if (!ID.test(id) || !NOM_IMAGE.test(nom)) return c.json({ erreur: 'Image introuvable' }, 404)
  const objet = await c.env.IMAGES.get(cleR2(id, nom))
  if (!objet) return c.json({ erreur: 'Image introuvable' }, 404)
  return new Response(objet.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: objet.httpEtag,
    },
  })
})
