import { describe, expect, it } from 'vitest'
import { domaineDe, domaineSurListe } from './domaines'

describe('domaineSurListe', () => {
  const liste = ['aliexpress.com', 'amazon.fr']

  it('reconnaît le domaine et ses sous-domaines', () => {
    expect(domaineSurListe('https://fr.aliexpress.com/item/123.html', liste)).toBe('aliexpress.com')
    expect(domaineSurListe('https://aliexpress.com/item/1', liste)).toBe('aliexpress.com')
    expect(domaineSurListe('https://www.amazon.fr/dp/B0', liste)).toBe('amazon.fr')
  })

  it('ne confond pas avec un domaine voisin', () => {
    expect(domaineSurListe('https://notaliexpress.com/x', liste)).toBeNull()
    expect(domaineSurListe('https://rapha.cc/produit', liste)).toBeNull()
  })

  it('ignore un lien invalide', () => {
    expect(domaineSurListe('pas un lien', liste)).toBeNull()
  })
})

describe('domaineDe', () => {
  it('garde les deux derniers segments', () => {
    expect(domaineDe('https://www.dotout.cc/products/zephyr')).toBe('dotout.cc')
    expect(domaineDe('nimporte quoi')).toBeNull()
  })
})
