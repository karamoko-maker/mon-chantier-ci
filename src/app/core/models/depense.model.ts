import { DateISO, Entite, Id } from './commun.model';

export type CategorieDepense =
  | 'transport'
  | 'location'
  | 'fonctionnement'
  | 'etudes'
  | 'administratif'
  | 'imprevus'
  | 'divers';

/**
 * Étape administrative de la dépense. Une commande, une facture et un paiement
 * sont trois choses différentes : le paiement est suivi séparément par montantPaye.
 */
export type EtapeDepense = 'prevue' | 'commandee' | 'facturee';

export interface Depense extends Entite {
  date: DateISO;
  categorie: CategorieDepense;
  /** Chaque dépense est affectée à une phase du chantier. */
  phaseId: Id | null;
  description: string;
  montantPrevu: number;
  montantPaye: number;
  etape: EtapeDepense;
  moyenPaiement: string;
  beneficiaire: string;
  reference: string;
  commentaire: string;
}
