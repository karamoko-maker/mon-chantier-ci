import { DateISO, Entite, Id, MoisISO } from './commun.model';

export interface Financement {
  /** Épargne actuellement détenue pour le projet (après les paiements déjà effectués). */
  epargneActuelle: number;
  /** Capacité d'épargne mensuelle nette, consacrée au chantier. */
  capaciteMensuelle: number;
  /** Dépenses personnelles à préserver : montant à ne jamais utiliser pour le chantier. */
  reservePersonnelle: number;
  /** Premier mois du calendrier de financement. */
  moisDebut: MoisISO;
  /** Nombre de mois affichés dans le calendrier. */
  horizonMois: number;
  /** Inclure la réserve pour imprévus dans les besoins du calendrier. */
  inclureReserveDansBesoins: boolean;
}

/** Revenu exceptionnel PRÉVU : jamais considéré comme disponible avant sa date. */
export interface RevenuExceptionnel extends Entite {
  libelle: string;
  montant: number;
  datePrevue: DateISO;
  /** Une fois reçu, il doit être ajouté à l'épargne actuelle et n'est plus projeté. */
  recu: boolean;
}

export interface ObjectifEpargne extends Entite {
  libelle: string;
  /** Montant saisi manuellement ; null = calculé à partir des phases sélectionnées. */
  montantManuel: number | null;
  phaseIds: Id[];
  /** Date à laquelle l'utilisateur souhaite financer ces travaux. */
  dateSouhaitee: DateISO | null;
}
