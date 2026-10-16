import { DateISO, Entite, Id } from './commun.model';

export type ModeRemuneration = 'journalier' | 'forfait';

/** Intervention d'ouvriers ou d'un prestataire sur une phase. */
export interface Intervention extends Entite {
  metier: string;
  prestataire: string;
  phaseId: Id | null;
  date: DateISO;
  mode: ModeRemuneration;
  nombrePersonnes: number;
  tarifJournalier: number;
  nombreJours: number;
  /** Total d'heures supplémentaires (toutes personnes confondues). */
  heuresSupplementaires: number;
  tarifHoraireSup: number;
  montantForfait: number;
  /** Pour un forfait : métiers déjà couverts par ce devis (contrôle des doubles comptages). */
  prestationsCouvertes: string[];
  /** Acomptes et paiements déjà versés. */
  montantPaye: number;
  commentaire: string;
}

/** Enveloppe budgétaire de planification par métier (fourchette indicative). */
export interface EnveloppeMainOeuvre extends Entite {
  metier: string;
  montantMin: number;
  montantMax: number;
  montantRetenu: number;
  phaseId: Id | null;
  inclureAuBudget: boolean;
}

/** Tarif journalier de référence par métier (paramétrable). */
export interface TarifMetier {
  metier: string;
  tarifJournalier: number;
}
