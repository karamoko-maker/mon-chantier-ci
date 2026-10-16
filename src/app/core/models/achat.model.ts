import { DateISO, Entite, Id } from './commun.model';

/** Achat (commande) de matériau auprès d'un fournisseur. */
export interface Achat extends Entite {
  date: DateISO;
  materiauId: Id;
  phaseId: Id | null;
  quantiteCommandee: number;
  quantiteLivree: number;
  /** Prix réellement négocié pour cet achat (peut différer du catalogue). */
  prixUnitaire: number;
  fournisseur: string;
  modePaiement: string;
  montantPaye: number;
  /** Numéro de bon de commande, de facture ou de reçu. */
  reference: string;
  commentaire: string;
}

/** Sortie de stock : quantité consommée sur le chantier. */
export interface Consommation extends Entite {
  date: DateISO;
  materiauId: Id;
  phaseId: Id | null;
  quantite: number;
  commentaire: string;
}
