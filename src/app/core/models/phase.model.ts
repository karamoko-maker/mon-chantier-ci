import { DateISO, Entite } from './commun.model';

export type StatutPhase = 'a_faire' | 'en_cours' | 'termine' | 'bloque';

/**
 * Tranche de travaux, pour construire progressivement :
 * 1 = études + gros œuvre RDC et R+1, 2 = gros œuvre R+2 et R+3, 3 = second œuvre et finitions.
 */
export type Tranche = 1 | 2 | 3;

export interface Phase extends Entite {
  ordre: number;
  nom: string;
  niveau: string;
  tranche: Tranche;
  dateDebut: DateISO | null;
  dateFin: DateISO | null;
  statut: StatutPhase;
  /** Avancement en pourcentage (0 à 100). */
  avancement: number;
  /** Budget validé après étude technique (null tant qu'aucune validation). */
  budgetValide: number | null;
  /** Autres coûts de la phase non couverts par les autres modules. */
  autresCouts: number;
  observations: string;
}
