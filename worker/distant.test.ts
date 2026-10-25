import { describe, expect, it } from 'vitest'
import { urlDistanteValide } from './distant'

describe('urlDistanteValide', () => {
  it('accepte une adresse https publique', () => {
    expect(urlDistanteValide('https://cdn.exemple.fr/photo.jpg?v=2')?.hostname).toBe('cdn.exemple.fr')
  })

  it.each([
    undefined,
    '',
    'pas une url',
    'http://exemple.fr/a.jpg',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'https://localhost/a.jpg',
    'https://127.0.0.1/a.jpg',
    'https://192.168.1.10/a.jpg',
    'https://[::1]/a.jpg',
    'https://machine.local/a.jpg',
  ])('refuse %s', (url) => {
    expect(urlDistanteValide(url)).toBeNull()
  })
})
