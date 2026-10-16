import { DateISO } from './commun.model';

/** Caractéristiques générales du projet immobilier. Toutes modifiables. */
export interface Projet {
  nom: string;
  pays: string;
  ville: string;
  commune: string;
  devise: string;
  /** Surface du terrain en m² (ne correspond pas forcément à la surface constructible). */
  surfaceTerrain: number;
  /** Surface constructible issue des règles d'urbanisme — inconnue tant que non déterminée. */
  surfaceConstructible: number | null;
  /** Surface construite estimative issue du plan architectural — inconnue tant que non déterminée. */
  surfaceConstruiteEstimee: number | null;
  typeBatiment: string;
  /** Nombre d'étages au-dessus du rez-de-chaussée (3 pour un R+3). */
  nombreEtages: number;
  styleArchitectural: string;
  configurationLogements: string;
  nombreLogements: number | null;
  dateDebutPrevue: DateISO | null;
  /** Pourcentage de réserve pour imprévus appliqué au budget de base. */
  pourcentageReserve: number;
  /** Le métré technique a-t-il été validé par un professionnel (ingénieur, métreur) ? */
  metreValide: boolean;
  metreValidePar: string;
  metreValideLe: DateISO | null;
  descriptif: string;
}
