import { DateISO, Entite, Id } from './commun.model';

export type ModeAcquisition = 'achete' | 'loue' | 'disponible';
export type EtatEquipement = 'neuf' | 'bon' | 'usage' | 'hors_service';

/**
 * Équipement de chantier. Son coût est compté UNE SEULE FOIS, dans la phase d'acquisition,
 * même s'il est réutilisé dans les phases suivantes.
 */
export interface Equipement extends Entite {
  nom: string;
  mode: ModeAcquisition;
  quantite: number;
  prixAchatUnitaire: number;
  coutLocationJournalier: number;
  dureeLocationJours: number;
  etat: EtatEquipement;
  dateAcquisition: DateISO | null;
  fournisseur: string;
  /** Phase d'acquisition (où le coût est imputé). */
  phaseId: Id | null;
  montantPaye: number;
  notes: string;
}
