export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  IMAGES: R2Bucket
  /** Domaine d'équipe Zero Trust, ex. `monequipe.cloudflareaccess.com`. */
  ACCESS_TEAM_DOMAIN: string
  /** Identifiant (AUD) de l'application Cloudflare Access. */
  ACCESS_AUD: string
  /** Dev local uniquement (.dev.vars) : e-mail simulé, ignoré hors localhost. */
  DEV_EMAIL?: string
}
