// Aide « Claude » par copier-coller : l'app écrit le prompt, l'utilisateur le passe à Claude
// puis recolle le JSON. Aucun appel à un LLM depuis l'app.
import { z } from 'zod'
import { LIBELLE_TYPE, type PieceEntree, type TypePiece } from '../shared/pieces'

export const MODELE_JSON = `{
  "nom": "nom court du produit",
  "marque": "marque",
  "composition": "une ligne, ex. Extérieur : 92 % nylon, 8 % élasthanne. Intérieur : 82 % polyester, 18 % élasthanne",
  "grammage": "une ligne, ex. 180 g/m² (ou poids total si c'est la seule info)",
  "chaleur": 0,
  "coupeVent": 0,
  "impermeabilite": 0,
  "respirabilite": 0,
  "compressible": false,
  "justification": "2 ou 3 phrases : sur quoi tu te bases pour les notes"
}`

export type EntreePrompt = {
  type: TypePiece
  lien: string
  nom: string
  marque: string
  /** Texte de la fiche produit, si le lien ne peut pas être lu. */
  texteFiche: string
}

export function construirePrompt({ type, lien, nom, marque, texteFiche }: EntreePrompt): string {
  const connu = [nom && `Nom : ${nom}`, marque && `Marque : ${marque}`].filter(Boolean).join('\n')
  return `Tu es expert en textile pour le cyclisme sur route. Je veux renseigner une pièce de ma garde-robe pour une app qui me dit comment m'habiller selon la météo.

Pièce :
Type : ${LIBELLE_TYPE[type]}
Lien produit : ${lien.trim() || '(aucun)'}
${connu}
${texteFiche.trim() ? `\nTexte de la fiche produit :\n"""\n${texteFiche.trim()}\n"""\n` : ''}
Consignes :
- Ouvre le lien et lis la fiche produit. Si tu ne peux pas la lire et que je n'ai pas fourni son texte, réponds uniquement {"erreur": "raison"} : n'invente rien.
- N'invente aucune donnée. Si une information manque, laisse la chaîne vide et estime les notes avec prudence.
- La composition tient en une ligne. S'il y a plusieurs tissus, indique-les tous (extérieur, intérieur, panneaux).
- Les notes sont des entiers de 0 à 5, sur la même échelle pour tous mes vêtements : elles sont additionnées quand je superpose des couches. Note la pièce telle qu'elle est portée, en moyenne si elle mélange plusieurs tissus. Les fiches marketing exagèrent : en cas de doute, note plus bas la protection (coupe-vent, imperméabilité).

Échelle :
- chaleur : 0 aucune isolation (été), 1 maillot d'été ou gilet sans doublure, 2 manches longues mi-saison ou sous-maillot thermique léger, 3 thermique d'hiver doux (10 °C environ), 4 veste d'hiver chaude (autour de 0 à 5 °C), 5 très chaud (sous 0 °C).
- coupeVent : 0 tissu aéré ou filet, 1 maillot classique, 2 softshell léger ou panneaux partiels, 3 tissu serré ou panneau avant coupe-vent, 4 veste ou gilet coupe-vent, 5 bloque totalement l'air.
- impermeabilite : 0 absorbe l'eau, 1 déperlant léger, 2 résiste à la bruine, 3 résiste à une averse courte, 4 imperméable (coutures non étanches ou partielles), 5 imperméable total (coutures thermosoudées).
- respirabilite : 0 pas du tout, 1 faible (membrane), 2 correcte (coupe-vent classique), 3 bonne, 4 très bonne, 5 excellente (maille technique).
- compressible : true seulement si la pièce se plie assez petit pour une poche de maillot.

Réponds uniquement par un bloc JSON valide, sans texte autour, de cette forme :
${MODELE_JSON}`
}

const nombre = (v: unknown) => {
  if (typeof v === 'string') return v.trim() === '' ? Number.NaN : Number(v.trim().replace(',', '.'))
  return v
}
const indice = z.preprocess(nombre, z.number().min(0).max(5)).transform((n) => Math.round(n))
const texte = (max: number) => z.string().trim().transform((s) => s.slice(0, max))

export const schemaReponseLlm = z.object({
  nom: texte(120).default(''),
  marque: texte(80).default(''),
  composition: texte(300),
  grammage: texte(100),
  chaleur: indice,
  coupeVent: indice,
  impermeabilite: indice,
  respirabilite: indice,
  compressible: z.boolean(),
  justification: texte(600).default(''),
})

export type ReponseLlm = z.infer<typeof schemaReponseLlm>

const schemaErreurLlm = z.object({ erreur: z.string() })

function extraireJson(brut: string): unknown {
  const bloc = brut.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidat = bloc?.[1] ?? brut.slice(brut.indexOf('{'), brut.lastIndexOf('}') + 1)
  if (!candidat.trim()) throw new Error('Aucun JSON trouvé dans ce texte.')
  return JSON.parse(candidat)
}

export type ResultatAnalyse = { ok: true; reponse: ReponseLlm } | { ok: false; erreur: string }

/** Valide le texte collé : accepte un bloc ```json, ou du JSON entouré de texte. */
export function analyserReponse(brut: string): ResultatAnalyse {
  let json: unknown
  try {
    json = extraireJson(brut)
  } catch (e) {
    const detail = e instanceof SyntaxError ? 'JSON mal formé' : e instanceof Error ? e.message : String(e)
    return { ok: false, erreur: `${detail} Recopie toute la réponse de Claude, de { à }.` }
  }

  const refus = schemaErreurLlm.safeParse(json)
  if (refus.success) {
    return {
      ok: false,
      erreur: `Claude n'a pas pu lire la page : ${refus.data.erreur}. Colle le texte de la fiche produit dans l'app et recopie le nouveau prompt.`,
    }
  }

  const analyse = schemaReponseLlm.safeParse(json)
  if (!analyse.success) {
    const premier = analyse.error.issues[0]
    return { ok: false, erreur: `Réponse incomplète ou invalide (champ « ${premier?.path.join('.')} »).` }
  }
  return { ok: true, reponse: analyse.data }
}

/** Applique la réponse au formulaire : nom et marque seulement s'ils sont vides, le reste est remplacé. */
export function appliquerReponse(form: PieceEntree, r: ReponseLlm): PieceEntree {
  return {
    ...form,
    nom: form.nom.trim() || r.nom,
    marque: form.marque.trim() || r.marque,
    composition: r.composition,
    grammage: r.grammage,
    chaleur: r.chaleur,
    coupeVent: r.coupeVent,
    impermeabilite: r.impermeabilite,
    respirabilite: r.respirabilite,
    compressible: r.compressible,
  }
}
