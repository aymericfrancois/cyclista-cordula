import { describe, expect, it } from 'vitest'
import { analyserReponse, appliquerReponse, construirePrompt, MODELE_JSON, schemaReponseLlm } from './llm'
import type { PieceEntree } from '../shared/pieces'

const json = {
  nom: 'Zephyr',
  marque: 'Dotout',
  composition: 'Extérieur : 92 % nylon. Intérieur : 82 % polyester',
  grammage: '150-200 g',
  chaleur: 3,
  coupeVent: 4,
  impermeabilite: 2,
  respirabilite: 3,
  compressible: false,
  justification: 'Deux tissus, moyenne.',
}

describe('construirePrompt', () => {
  const base = { type: 'gilet' as const, lien: 'https://exemple.fr/p', nom: '', marque: '', texteFiche: '' }

  it('contient le lien, le type en français et le modèle JSON', () => {
    const p = construirePrompt(base)
    expect(p).toContain('https://exemple.fr/p')
    expect(p).toContain('Gilet coupe-vent')
    expect(p).toContain(MODELE_JSON)
  })

  it('n’ajoute le texte de la fiche que s’il existe', () => {
    expect(construirePrompt(base)).not.toContain('Texte de la fiche produit')
    expect(construirePrompt({ ...base, texteFiche: 'Tissu bleu nylon' })).toContain('Tissu bleu nylon')
  })

  it('le modèle JSON du prompt est accepté par le schéma', () => {
    expect(schemaReponseLlm.safeParse(JSON.parse(MODELE_JSON)).success).toBe(true)
  })
})

describe('analyserReponse', () => {
  it('lit un bloc ```json', () => {
    const r = analyserReponse('Voici :\n```json\n' + JSON.stringify(json) + '\n```\nBonne sortie !')
    expect(r.ok && r.reponse.chaleur).toBe(3)
  })

  it('lit du JSON brut entouré de texte', () => {
    expect(analyserReponse('Réponse : ' + JSON.stringify(json) + ' fin').ok).toBe(true)
  })

  it('accepte des notes en texte et arrondit', () => {
    const r = analyserReponse(JSON.stringify({ ...json, chaleur: '3', coupeVent: 3.6, respirabilite: '2,4' }))
    expect(r.ok && [r.reponse.chaleur, r.reponse.coupeVent, r.reponse.respirabilite]).toEqual([3, 4, 2])
  })

  it.each([
    ['note hors échelle', { ...json, chaleur: 7 }],
    ['note vide', { ...json, chaleur: '' }],
    ['note manquante', { ...json, coupeVent: undefined }],
    ['compressible texte', { ...json, compressible: 'oui' }],
  ])('refuse : %s', (_nom, corps) => {
    expect(analyserReponse(JSON.stringify(corps)).ok).toBe(false)
  })

  it('explique quand Claude n’a pas pu lire la page', () => {
    const r = analyserReponse('{"erreur": "page protégée"}')
    expect(!r.ok && r.erreur).toContain('page protégée')
  })

  it('refuse un texte sans JSON ou mal formé', () => {
    expect(analyserReponse('bonjour').ok).toBe(false)
    expect(analyserReponse('{"nom": ').ok).toBe(false)
  })

  it('tronque les textes trop longs au lieu de refuser', () => {
    const r = analyserReponse(JSON.stringify({ ...json, composition: 'x'.repeat(500) }))
    expect(r.ok && r.reponse.composition.length).toBe(300)
  })
})

describe('appliquerReponse', () => {
  const form: PieceEntree = {
    sport: 'velo', nom: 'Mon nom', marque: '', lien: null, type: 'gilet', zones: ['tronc_exterieur'],
    composition: '', grammage: '', chaleur: 0, coupeVent: 0, impermeabilite: 0, respirabilite: 0,
    compressible: true, etat: 'dispo',
  }

  it('garde le nom saisi, complète la marque vide et remplace le reste', () => {
    const r = analyserReponse(JSON.stringify(json))
    if (!r.ok) throw new Error('réponse invalide')
    const resultat = appliquerReponse(form, r.reponse)
    expect(resultat.nom).toBe('Mon nom')
    expect(resultat.marque).toBe('Dotout')
    expect(resultat.chaleur).toBe(3)
    expect(resultat.compressible).toBe(false)
    expect(resultat.zones).toEqual(['tronc_exterieur'])
  })
})
