export const LARGEUR_MAX = 1200

/** Réduit proportionnellement si l'image dépasse la largeur max, sinon ne touche à rien. */
export function calculerTaille(largeur: number, hauteur: number, max = LARGEUR_MAX) {
  if (largeur <= max) return { largeur, hauteur }
  return { largeur: max, hauteur: Math.round((hauteur * max) / largeur) }
}

/** Redimensionne (1200 px max) et convertit en WebP avant l'envoi : photos et PNG Flux inclus. */
export async function compresserEnWebp(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' })
  const { largeur, hauteur } = calculerTaille(image.width, image.height)
  const toile = document.createElement('canvas')
  toile.width = largeur
  toile.height = hauteur
  const contexte = toile.getContext('2d')
  if (!contexte) throw new Error('Canvas indisponible')
  contexte.drawImage(image, 0, 0, largeur, hauteur)
  image.close()
  return new Promise((resoudre, rejeter) => {
    toile.toBlob(
      (blob) =>
        blob && blob.type === 'image/webp' ? resoudre(blob) : rejeter(new Error('Ce navigateur ne produit pas de WebP')),
      'image/webp',
      0.85,
    )
  })
}
