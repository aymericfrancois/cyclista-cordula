import { describe, expect, it } from 'vitest'
import {
  COMPRESSIBLE_PAR_TYPE,
  ETATS,
  type Etat,
  ETAT_SUIVANT,
  TYPES,
  ZONES,
  ZONES_PAR_TYPE,
  imageAffichee,
  schemaPieceEntree,
} from './pieces'

const valide = {
  sport: 'velo',
  nom: 'Gilet Rapha',
  marque: 'Rapha',
  lien: 'https://exemple.fr/gilet',
  type: 'gilet',
  zones: ['tronc_exterieur'],
  composition: '100 % polyamide',
  grammage: '40 g/m²',
  chaleur: 1,
  coupeVent: 4,
  impermeabilite: 1,
  respirabilite: 2,
  compressible: true,
  notes: '',
  etat: 'dispo',
}

describe('schemaPieceEntree', () => {
  it('accepte une pièce valide', () => {
    expect(schemaPieceEntree.safeParse(valide).success).toBe(true)
  })

  it('refuse un indice hors de 0 à 5', () => {
    expect(schemaPieceEntree.safeParse({ ...valide, chaleur: 6 }).success).toBe(false)
    expect(schemaPieceEntree.safeParse({ ...valide, chaleur: 2.5 }).success).toBe(false)
  })

  it('refuse un lien qui n’est pas http ou https', () => {
    expect(schemaPieceEntree.safeParse({ ...valide, lien: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('refuse une pièce sans zone', () => {
    expect(schemaPieceEntree.safeParse({ ...valide, zones: [] }).success).toBe(false)
  })
})

describe('tables par type', () => {
  it('chaque type a au moins une zone connue et une valeur « compressible »', () => {
    for (const type of TYPES) {
      expect(ZONES_PAR_TYPE[type].length).toBeGreaterThan(0)
      for (const zone of ZONES_PAR_TYPE[type]) expect(ZONES).toContain(zone)
      expect(typeof COMPRESSIBLE_PAR_TYPE[type]).toBe('boolean')
    }
  })

  it('chaque zone est couverte par au moins un type', () => {
    for (const zone of ZONES) {
      expect(TYPES.some((t) => ZONES_PAR_TYPE[t].includes(zone))).toBe(true)
    }
  })
})

describe('état', () => {
  it('le tap boucle sur les trois états', () => {
    let etat: Etat = 'dispo'
    const vus = new Set<string>()
    for (let i = 0; i < ETATS.length; i++) {
      vus.add(etat)
      etat = ETAT_SUIVANT[etat]
    }
    expect(vus.size).toBe(ETATS.length)
    expect(etat).toBe('dispo')
  })
})

describe('imageAffichee', () => {
  it('préfère l’image propre, sinon la première photo, sinon rien', () => {
    expect(imageAffichee({ imagePropre: 'p.webp', photos: ['a.webp'] })).toBe('p.webp')
    expect(imageAffichee({ imagePropre: null, photos: ['a.webp', 'b.webp'] })).toBe('a.webp')
    expect(imageAffichee({ imagePropre: null, photos: [] })).toBeNull()
  })
})
