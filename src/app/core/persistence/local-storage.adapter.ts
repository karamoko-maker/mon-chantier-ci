import { Injectable } from '@angular/core';
import { ChantierData } from '../models';
import { StockageAdapter } from './stockage.adapter';

export const CLE_STOCKAGE = 'mon-chantier-ci:donnees';

/** Persistance dans le localStorage du navigateur (données propres à cet appareil). */
@Injectable()
export class LocalStorageAdapter extends StockageAdapter {
  readonly libelle = 'Ce navigateur (stockage local)';
  readonly synchronise = false;

  async charger(): Promise<unknown | null> {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      return brut ? JSON.parse(brut) : null;
    } catch {
      return null;
    }
  }

  async enregistrer(donnees: ChantierData): Promise<void> {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
    } catch (e) {
      throw new Error(
        "Impossible d'enregistrer dans ce navigateur (stockage plein ou désactivé). Exportez vos données en JSON.",
        { cause: e },
      );
    }
  }

  async effacer(): Promise<void> {
    try {
      localStorage.removeItem(CLE_STOCKAGE);
    } catch {
      /* rien à faire */
    }
  }
}
