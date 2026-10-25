import { z } from 'zod'

/** Appelle l'API du Worker et valide la réponse avec un schéma zod. */
export async function appeler<T>(chemin: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const reponse = await fetch(`/api${chemin}`, { credentials: 'same-origin', ...init })
  if (!reponse.ok) {
    const detail = await reponse.json().then((j) => schemaErreur.parse(j).erreur, () => reponse.statusText)
    throw new Error(`${reponse.status} sur ${chemin} : ${detail}`)
  }
  return schema.parse(await reponse.json())
}

const schemaErreur = z.object({ erreur: z.string() })
export const schemaMoi = z.object({ email: z.string() })
export const schemaSante = z.object({ base: z.boolean(), images: z.boolean() })
export const schemaOk = z.object({ ok: z.literal(true) })

export function enJson(corps: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
