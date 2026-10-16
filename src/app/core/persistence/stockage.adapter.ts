import { ChantierData } from '../models';

/**
 * Contrat de persistance. Version 1 : stockage local du navigateur.
 * Pour passer à une API + PostgreSQL, il suffira d'écrire une classe `ApiStockageAdapter`
 * (appels HTTP vers le serveur) et de changer le fournisseur dans `app.config.ts`.
 */
export abstract class StockageAdapter {
  /** Libellé affiché à l'utilisateur (ex. « Ce navigateur »). */
  abstract readonly libelle: string;
  /** Les données sont-elles synchronisées entre plusieurs appareils ? */
  abstract readonly synchronise: boolean;
  /** Charge les données brutes (non validées) ou null si rien n'est enregistré. */
  abstract charger(): Promise<unknown | null>;
  abstract enregistrer(donnees: ChantierData): Promise<void>;
  abstract effacer(): Promise<void>;
}
