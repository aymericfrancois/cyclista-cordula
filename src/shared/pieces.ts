// Modèle des pièces, partagé entre le site et le Worker (pur zod, aucune API navigateur).
import { z } from 'zod'

export const SPORTS = ['velo'] as const

export const ZONES = [
  'tronc_base',
  'tronc_milieu',
  'tronc_exterieur',
  'jambes',
  'bras',
  'mains',
  'pieds',
  'tete_cou',
] as const

export const TYPES = [
  'sous_maillot',
  'maillot_mc',
  'maillot_ml',
  'veste',
  'gilet',
  'impermeable',
  'cuissard_court',
  'cuissard_long',
  'collant',
  'manchettes',
  'jambieres',
  'genouilleres',
  'gants_courts',
  'gants_longs',
  'couvre_chaussures',
  'chaussettes',
  'bonnet',
  'casquette',
  'cagoule',
  'tour_de_cou',
  'tour_oreilles',
] as const

export const ETATS = ['dispo', 'sale', 'lavage'] as const

export type Zone = (typeof ZONES)[number]
export type TypePiece = (typeof TYPES)[number]
export type Etat = (typeof ETATS)[number]

export const MAX_PHOTOS = 3

export const LIBELLE_ZONE: Record<Zone, string> = {
  tronc_base: 'Tronc base',
  tronc_milieu: 'Tronc milieu',
  tronc_exterieur: 'Tronc extérieur',
  jambes: 'Jambes',
  bras: 'Bras',
  mains: 'Mains',
  pieds: 'Pieds',
  tete_cou: 'Tête / cou',
}

export const LIBELLE_TYPE: Record<TypePiece, string> = {
  sous_maillot: 'Sous-maillot',
  maillot_mc: 'Maillot manches courtes',
  maillot_ml: 'Maillot manches longues',
  veste: 'Veste',
  gilet: 'Gilet coupe-vent',
  impermeable: 'Imperméable',
  cuissard_court: 'Cuissard court',
  cuissard_long: 'Cuissard long',
  collant: 'Collant',
  manchettes: 'Manchettes',
  jambieres: 'Jambières',
  genouilleres: 'Genouillères',
  gants_courts: 'Gants courts',
  gants_longs: 'Gants longs',
  couvre_chaussures: 'Couvre-chaussures',
  chaussettes: 'Chaussettes',
  bonnet: 'Bonnet',
  casquette: 'Casquette',
  cagoule: 'Cagoule',
  tour_de_cou: 'Tour de cou',
  tour_oreilles: 'Tour d’oreilles',
}

export const LIBELLE_ETAT: Record<Etat, string> = {
  dispo: 'Dispo',
  sale: 'Au sale',
  lavage: 'En lavage',
}

/** Un tap sur l'état : dispo, puis au sale, puis en lavage, puis de nouveau dispo. */
export const ETAT_SUIVANT: Record<Etat, Etat> = {
  dispo: 'sale',
  sale: 'lavage',
  lavage: 'dispo',
}

/** Zones couvertes par défaut selon le type (modifiables pièce par pièce). */
export const ZONES_PAR_TYPE: Record<TypePiece, Zone[]> = {
  sous_maillot: ['tronc_base'],
  maillot_mc: ['tronc_milieu'],
  maillot_ml: ['tronc_milieu', 'bras'],
  veste: ['tronc_exterieur', 'bras'],
  gilet: ['tronc_exterieur'],
  impermeable: ['tronc_exterieur', 'bras'],
  cuissard_court: ['jambes'],
  cuissard_long: ['jambes'],
  collant: ['jambes'],
  manchettes: ['bras'],
  jambieres: ['jambes'],
  genouilleres: ['jambes'],
  gants_courts: ['mains'],
  gants_longs: ['mains'],
  couvre_chaussures: ['pieds'],
  chaussettes: ['pieds'],
  bonnet: ['tete_cou'],
  casquette: ['tete_cou'],
  cagoule: ['tete_cou'],
  tour_de_cou: ['tete_cou'],
  tour_oreilles: ['tete_cou'],
}

/** Pièces qui tiennent dans une poche de maillot, par défaut. */
export const COMPRESSIBLE_PAR_TYPE: Record<TypePiece, boolean> = {
  sous_maillot: false,
  maillot_mc: false,
  maillot_ml: false,
  veste: false,
  gilet: true,
  impermeable: true,
  cuissard_court: false,
  cuissard_long: false,
  collant: false,
  manchettes: true,
  jambieres: true,
  genouilleres: true,
  gants_courts: true,
  gants_longs: false,
  couvre_chaussures: false,
  chaussettes: false,
  bonnet: true,
  casquette: true,
  cagoule: true,
  tour_de_cou: true,
  tour_oreilles: true,
}

const indice = z.number().int().min(0).max(5)

/** Ce que l'utilisateur saisit (aussi utilisé pour valider le JSON collé en phase 3). */
export const schemaPieceEntree = z.object({
  sport: z.enum(SPORTS),
  nom: z.string().trim().min(1).max(120),
  marque: z.string().trim().max(80),
  // Seuls http et https : le lien est affiché dans un <a href>.
  lien: z
    .string()
    .trim()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u) && URL.canParse(u), 'Lien invalide')
    .nullable(),
  type: z.enum(TYPES),
  zones: z.array(z.enum(ZONES)).min(1),
  composition: z.string().trim().max(300),
  grammage: z.string().trim().max(100),
  chaleur: indice,
  coupeVent: indice,
  impermeabilite: indice,
  respirabilite: indice,
  compressible: z.boolean(),
  /** Retours d'usage, transmis à Claude pour ajuster les indices. */
  notes: z.string().trim().max(500),
  etat: z.enum(ETATS),
})

export const schemaPiece = schemaPieceEntree.extend({
  id: z.string(),
  /** Noms des fichiers dans R2, à lire via /api/images/<id>/<nom>. */
  photos: z.array(z.string()),
  imagePropre: z.string().nullable(),
  creeLe: z.string(),
  majLe: z.string(),
})

export const schemaEtat = z.object({ etat: z.enum(ETATS) })

export type PieceEntree = z.infer<typeof schemaPieceEntree>
export type Piece = z.infer<typeof schemaPiece>

/** Image à afficher : la propre si elle existe, sinon la première photo. */
export function imageAffichee(piece: Pick<Piece, 'photos' | 'imagePropre'>): string | null {
  return piece.imagePropre ?? piece.photos[0] ?? null
}
