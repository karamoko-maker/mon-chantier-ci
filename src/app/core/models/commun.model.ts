/** Identifiant unique d'une entité (UUID). */
export type Id = string;

/** Date au format ISO court « AAAA-MM-JJ ». */
export type DateISO = string;

/** Mois au format « AAAA-MM ». */
export type MoisISO = string;

/** Toute entité stockée dans une collection possède un identifiant. */
export interface Entite {
  id: Id;
}
