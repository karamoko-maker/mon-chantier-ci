import { DateISO, Entite, Id } from './commun.model';

/** D'où vient le prix unitaire : il n'est jamais présenté comme un tarif garanti. */
export type OriginePrix = 'a_renseigner' | 'hypothese' | 'devis' | 'facture';

export interface Materiau extends Entite {
  nom: string;
  categorie: string;
  unite: string;
  prixUnitaire: number;
  originePrix: OriginePrix;
  fournisseur: string;
  dateMajPrix: DateISO | null;
  /** Seuil en dessous duquel le stock disponible est signalé comme faible (0 = pas d'alerte). */
  seuilAlerte: number;
  /** Matériau structurel : quantités à reprendre du métré de l'ingénieur (béton, fer…). */
  structurel: boolean;
  notes: string;
}

/** Origine d'une quantité estimée. */
export type SourceQuantite = 'hypothese' | 'metre_ingenieur';

/**
 * Ligne d'estimation des besoins en matériaux.
 * Le prix n'est pas recopié : il vient toujours du catalogue (pas de donnée dupliquée).
 */
export interface LigneEstimation extends Entite {
  materiauId: Id;
  /** Phase concernée ; null = estimation globale pas encore répartie. */
  phaseId: Id | null;
  quantite: number;
  source: SourceQuantite;
  /** Quantité validée par un professionnel. */
  valide: boolean;
  /** Permet d'exclure une ligne du budget (par exemple pour éviter un double comptage). */
  inclureAuBudget: boolean;
  commentaire: string;
}
