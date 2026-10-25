// Sites que Claude ne peut pas lire : on ouvre directement la zone « coller la page ».

/** Sites connus pour bloquer les robots. */
export const DOMAINES_ILLISIBLES = ['aliexpress.com', 'aliexpress.us', 'temu.com', 'amazon.fr', 'amazon.com']

const CLE = 'cordula.domainesAColler'

/** `www.fr.aliexpress.com` donne `aliexpress.com` : on compare le domaine et ses parents. */
export function domaineSurListe(lien: string, liste: string[]): string | null {
  if (!URL.canParse(lien)) return null
  const hote = new URL(lien).hostname.toLowerCase()
  return liste.find((d) => hote === d || hote.endsWith(`.${d}`)) ?? null
}

export function domaineDe(lien: string): string | null {
  if (!URL.canParse(lien)) return null
  const parties = new URL(lien).hostname.toLowerCase().split('.')
  return parties.slice(-2).join('.')
}

function lireMemorises(): string[] {
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]')
    return Array.isArray(brut) ? brut.filter((d): d is string => typeof d === 'string') : []
  } catch {
    return []
  }
}

/** Ce lien est-il d'un site à coller (connu d'avance, ou déjà collé une fois par l'utilisateur) ? */
export function siteAColler(lien: string): boolean {
  return domaineSurListe(lien, [...DOMAINES_ILLISIBLES, ...lireMemorises()]) !== null
}

export function memoriserSiteAColler(lien: string) {
  const domaine = domaineDe(lien)
  if (!domaine || siteAColler(lien)) return
  try {
    localStorage.setItem(CLE, JSON.stringify([...lireMemorises(), domaine]))
  } catch {
    // Stockage indisponible : l'app fonctionne sans cette mémoire.
  }
}
