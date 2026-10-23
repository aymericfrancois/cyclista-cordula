import { z } from 'zod'

/** Appelle l'API du Worker et valide la réponse avec un schéma zod. */
export async function appeler<T>(chemin: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const reponse = await fetch(`/api${chemin}`, { credentials: 'same-origin', ...init })
  if (!reponse.ok) throw new Error(`Erreur ${reponse.status} sur ${chemin}`)
  return schema.parse(await reponse.json())
}

export const schemaMoi = z.object({ email: z.string() })
export const schemaSante = z.object({ base: z.boolean(), images: z.boolean() })
