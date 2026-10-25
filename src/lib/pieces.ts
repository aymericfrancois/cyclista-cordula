import { z } from 'zod'
import { appeler, enJson, schemaOk } from './api'
import { schemaPiece, type Etat, type Piece, type PieceEntree } from '../shared/pieces'

const schemaListe = z.array(schemaPiece)
const webp = (blob: Blob): RequestInit => ({ headers: { 'Content-Type': 'image/webp' }, body: blob })

export const listerPieces = () => appeler('/pieces', schemaListe)
export const lirePiece = (id: string) => appeler(`/pieces/${id}`, schemaPiece)
export const creerPiece = (p: PieceEntree) => appeler('/pieces', schemaPiece, { method: 'POST', ...enJson(p) })
export const modifierPiece = (id: string, p: PieceEntree) =>
  appeler(`/pieces/${id}`, schemaPiece, { method: 'PUT', ...enJson(p) })
export const changerEtat = (id: string, etat: Etat) =>
  appeler(`/pieces/${id}/etat`, schemaPiece, { method: 'PATCH', ...enJson({ etat }) })
export const supprimerPiece = (id: string) => appeler(`/pieces/${id}`, schemaOk, { method: 'DELETE' })

export const ajouterPhoto = (id: string, image: Blob) =>
  appeler(`/pieces/${id}/photos`, schemaPiece, { method: 'POST', ...webp(image) })
export const supprimerPhoto = (id: string, nom: string) =>
  appeler(`/pieces/${id}/photos/${nom}`, schemaPiece, { method: 'DELETE' })
export const definirImagePropre = (id: string, image: Blob) =>
  appeler(`/pieces/${id}/image-propre`, schemaPiece, { method: 'PUT', ...webp(image) })
export const supprimerImagePropre = (id: string) =>
  appeler(`/pieces/${id}/image-propre`, schemaPiece, { method: 'DELETE' })

export const urlImage = (piece: Pick<Piece, 'id'>, nom: string) => `/api/images/${piece.id}/${nom}`
