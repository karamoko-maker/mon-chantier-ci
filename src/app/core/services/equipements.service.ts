import { Injectable, computed, inject } from '@angular/core';
import { coutEquipement } from '../calculs/equipement.calc';
import { Equipement, Id } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';

/** Inventaire du matériel de chantier. */
@Injectable({ providedIn: 'root' })
export class EquipementsService {
  private readonly store = inject(ChantierStore);
  readonly equipements = computed(() =>
    this.store.equipements().map((e) => ({ equipement: e, cout: coutEquipement(e) })),
  );

  ajouter(e: Omit<Equipement, 'id'>): Id {
    return this.store.ajouter('equipements', e);
  }
  modifier(id: Id, modifications: Partial<Equipement>): void {
    this.store.modifier('equipements', id, modifications);
  }
  supprimer(id: Id): void {
    this.store.supprimer('equipements', id);
  }
}
