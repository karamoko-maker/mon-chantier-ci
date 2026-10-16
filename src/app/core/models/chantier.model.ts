import { Achat, Consommation } from './achat.model';
import { Depense } from './depense.model';
import { Equipement } from './equipement.model';
import { Financement, ObjectifEpargne, RevenuExceptionnel } from './financement.model';
import { EnveloppeMainOeuvre, Intervention } from './main-oeuvre.model';
import { LigneEstimation, Materiau } from './materiau.model';
import { Parametres } from './parametres.model';
import { Phase } from './phase.model';
import { Projet } from './projet.model';

/** Version du schéma de données (pour les migrations futures). */
export const VERSION_SCHEMA = 1;

/**
 * Racine de toutes les données d'un chantier. C'est cet objet qui est sauvegardé,
 * exporté en JSON, et qui sera demain envoyé à l'API / PostgreSQL.
 */
export interface ChantierData {
  versionSchema: number;
  projet: Projet;
  phases: Phase[];
  materiaux: Materiau[];
  estimation: LigneEstimation[];
  achats: Achat[];
  consommations: Consommation[];
  equipements: Equipement[];
  interventions: Intervention[];
  enveloppes: EnveloppeMainOeuvre[];
  depenses: Depense[];
  financement: Financement;
  revenus: RevenuExceptionnel[];
  objectifs: ObjectifEpargne[];
  parametres: Parametres;
}

/** Noms des collections (tableaux d'entités) de ChantierData. */
export type CleCollection =
  | 'phases'
  | 'materiaux'
  | 'estimation'
  | 'achats'
  | 'consommations'
  | 'equipements'
  | 'interventions'
  | 'enveloppes'
  | 'depenses'
  | 'revenus'
  | 'objectifs';

export type ElementDe<K extends CleCollection> = ChantierData[K][number];
