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
  "confiance": "moyenne",
  "justification": "2 ou 3 phrases : sur quoi tu te bases pour les notes"
}`

/** Au-delà, le texte de la page est tronqué : les fiches AliExpress sont énormes et le début suffit. */
export const MAX_TEXTE_FICHE = 15000

export type Actuel = Pick<PieceEntree, 'composition' | 'grammage' | 'chaleur' | 'coupeVent' | 'impermeabilite' | 'respirabilite'>

export type EntreePrompt = {
  type: TypePiece
  lien: string
  nom: string
  marque: string
  /** Texte de la page produit collé par l'utilisateur : Claude n'ouvre alors pas le lien. */
  texteFiche: string
  /** Retours d'usage de l'utilisateur (« je transpire beaucoup dedans »). */
  notes: string
  /** Valeurs déjà enregistrées : Claude les ajuste au lieu de repartir de zéro. */
  actuel?: Actuel
}

const aDesValeurs = (a: Actuel) =>
  a.composition.trim() !== '' || a.grammage.trim() !== '' || a.chaleur + a.coupeVent + a.impermeabilite + a.respirabilite > 0

export function construirePrompt({ type, lien, nom, marque, texteFiche, notes, actuel }: EntreePrompt): string {
  const fiche = texteFiche.trim().slice(0, MAX_TEXTE_FICHE)
  const connu = [nom.trim() && `Nom : ${nom.trim()}`, marque.trim() && `Marque : ${marque.trim()}`].filter(Boolean).join('\n')
  const sections = [
    `Tu es expert en textile pour le cyclisme sur route. Je veux renseigner une pièce de ma garde-robe pour une app qui me dit comment m'habiller selon la météo.`,
    `Pièce :\nType : ${LIBELLE_TYPE[type]}\nLien produit : ${lien.trim() || '(aucun)'}${connu ? `\n${connu}` : ''}`,
  ]
  if (fiche) sections.push(`Texte de la fiche produit (copié depuis la page) :\n"""\n${fiche}\n"""`)
  if (actuel && aDesValeurs(actuel)) {
    sections.push(
      `Valeurs déjà enregistrées dans l'app (à ajuster si c'est justifié, pas à refaire de zéro) :\ncomposition : ${actuel.composition || '(vide)'}\ngrammage : ${actuel.grammage || '(vide)'}\nchaleur ${actuel.chaleur}, coupeVent ${actuel.coupeVent}, impermeabilite ${actuel.impermeabilite}, respirabilite ${actuel.respirabilite}`,
    )
  }
  if (notes.trim()) {
    sections.push(`Mes retours d'usage (ils priment sur la fiche quand ils la contredisent) :\n${notes.trim()}`)
  }

  const source = fiche
    ? `- Base-toi uniquement sur le texte de la fiche ci-dessus. N'ouvre pas le lien.`
    : `- Ouvre le lien et lis la fiche produit. Si tu ne peux pas la lire, réponds uniquement {"erreur": "raison"} : n'invente rien.`
  const retours = notes.trim()
    ? `\n- Si mes retours d'usage contredisent la fiche (par exemple « je transpire beaucoup » : respirabilité plus basse), ajuste les notes en conséquence et dis-le dans la justification.`
    : ''

  sections.push(`Consignes :
${source}
- N'invente aucune donnée. Si la fiche est incomplète (pas de pourcentages, pas de grammage...) : écris ce qui est connu dans la composition (ex. « polyester + élasthanne, pourcentages non précisés »), laisse le grammage vide s'il est inconnu, et estime les notes d'après le type de pièce, les tissus et les détails de construction.
- confiance : « haute » seulement si composition et grammage sont connus, « moyenne » s'il en manque un, « faible » si tu estimes surtout d'après le type de pièce.
- La composition tient en une ligne. S'il y a plusieurs tissus, indique-les tous (extérieur, intérieur, panneaux).
- Les notes sont des entiers de 0 à 5, sur la même échelle pour tous mes vêtements : elles sont additionnées quand je superpose des couches. Note la pièce telle qu'elle est portée, en moyenne si elle mélange plusieurs tissus. Les fiches marketing exagèrent : en cas de doute, note plus bas la protection (coupe-vent, imperméabilité).${retours}

Échelle :
- chaleur : 0 aucune isolation (été), 1 maillot d'été ou gilet sans doublure, 2 manches longues mi-saison ou sous-maillot thermique léger, 3 thermique d'hiver doux (10 °C environ), 4 veste d'hiver chaude (autour de 0 à 5 °C), 5 très chaud (sous 0 °C).
- coupeVent : 0 tissu aéré ou filet, 1 maillot classique, 2 softshell léger ou panneaux partiels, 3 tissu serré ou panneau avant coupe-vent, 4 veste ou gilet coupe-vent, 5 bloque totalement l'air.
- impermeabilite : 0 absorbe l'eau, 1 déperlant léger, 2 résiste à la bruine, 3 résiste à une averse courte, 4 imperméable (coutures non étanches ou partielles), 5 imperméable total (coutures thermosoudées).
- respirabilite : 0 pas du tout, 1 faible (membrane), 2 correcte (coupe-vent classique), 3 bonne, 4 très bonne, 5 excellente (maille technique).
- compressible : true seulement si la pièce se plie assez petit pour une poche de maillot.

Réponds uniquement par un bloc JSON valide, sans texte autour, de cette forme :
${MODELE_JSON}`)
  return sections.join('\n\n')
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
  confiance: z.enum(['haute', 'moyenne', 'faible']).default('moyenne'),
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
