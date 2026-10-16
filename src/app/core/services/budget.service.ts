import { Injectable, computed, inject } from '@angular/core';
import { BudgetPhase, calculerSynthese } from '../calculs/budget.calc';
import { ChantierStore } from '../persistence/chantier-store.service';

/** Synthèse budgétaire recalculée automatiquement quand les données budgétaires changent. */
@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly store = inject(ChantierStore);
  /** Ne dépend que des données budgétaires : les saisies d'épargne ou de paramètres ne la relancent pas. */
  readonly synthese = computed(() => calculerSynthese(this.store.donneesBudget()));
  private readonly parPhase = computed(() => new Map(this.synthese().phases.map((p) => [p.phase.id, p])));

  budgetPhase(id: string): BudgetPhase | null {
    return this.parPhase().get(id) ?? null;
  }
}
