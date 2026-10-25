export const LARGEUR_MAX = 1200

/** Réduit proportionnellement si l'image dépasse la largeur max, sinon ne touche à rien. */
export function calculerTaille(largeur: number, hauteur: number, max = LARGEUR_MAX) {
  if (largeur <= max) return { largeur, hauteur }
  return { largeur: max, hauteur: Math.round((hauteur * max) / largeur) }
}

/** Redimensionne (1200 px max) et convertit en WebP avant l'envoi : photos et PNG Flux inclus. */
export async function compresserEnWebp(fichier: Blob): Promise<Blob> {
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

/** Télécharge une image en ligne via le Worker (le navigateur ne peut pas le faire lui-même : CORS). */
export async function telechargerImage(lien: string): Promise<File> {
  const reponse = await fetch(`/api/image-distante?url=${encodeURIComponent(lien.trim())}`, { credentials: 'same-origin' })
  if (!reponse.ok) {
    const detail = await reponse.json().then((j: { erreur?: string }) => j.erreur, () => undefined)
    throw new Error(detail ?? `Téléchargement impossible (${reponse.status})`)
  }
  const blob = await reponse.blob()
  return new File([blob], 'image-en-ligne', { type: blob.type })
}

/** Lit une image dans le presse-papiers (bouton « Coller »). */
export async function imageDuPressePapiers(): Promise<File> {
  const elements = await navigator.clipboard.read()
  for (const element of elements) {
    const type = element.types.find((t) => t.startsWith('image/'))
    if (type) return new File([await element.getType(type)], 'image-collee', { type })
  }
  throw new Error('Aucune image dans le presse-papiers')
}

/** Premier fichier image d'un événement « coller » (Ctrl+V), s'il y en a un. */
export function imageDeLEvenement(evenement: ClipboardEvent | React.ClipboardEvent): File | null {
  const fichiers = [...(evenement.clipboardData?.files ?? [])]
  return fichiers.find((f) => f.type.startsWith('image/')) ?? null
}
