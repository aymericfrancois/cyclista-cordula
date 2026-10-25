import { describe, expect, it } from 'vitest'
import { calculerTaille } from './image'

describe('calculerTaille', () => {
  it('ne touche pas une image déjà assez petite', () => {
    expect(calculerTaille(800, 600)).toEqual({ largeur: 800, hauteur: 600 })
    expect(calculerTaille(1200, 900)).toEqual({ largeur: 1200, hauteur: 900 })
  })

  it('ramène à 1200 px de large en gardant les proportions', () => {
    expect(calculerTaille(4000, 3000)).toEqual({ largeur: 1200, hauteur: 900 })
    expect(calculerTaille(3000, 4000)).toEqual({ largeur: 1200, hauteur: 1600 })
  })
})
