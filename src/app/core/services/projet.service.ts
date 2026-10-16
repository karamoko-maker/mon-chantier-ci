import { Injectable, computed, inject } from '@angular/core';
import { Projet } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';

/** Caractéristiques du projet et validation technique. */
@Injectable({ providedIn: 'root' })
export class ProjetService {
  private readonly store = inject(ChantierStore);
  readonly projet = this.store.projet;
  readonly metreValide = computed(() => this.projet().metreValide);

  mettreAJour(modifications: Partial<Projet>): void {
    this.store.mettreAJour((d) => ({ ...d, projet: { ...d.projet, ...modifications } }));
  }
}
