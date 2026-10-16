import { Injectable, computed, inject } from '@angular/core';
import { Alerte, DonneesControles, genererAlertes, NiveauAlerte } from '../calculs/controles.calc';
import { grouperPar } from '../calculs/regroupement';
import { ChantierStore } from '../persistence/chantier-store.service';
import { AchatsStocksService } from './achats-stocks.service';
import { BudgetService } from './budget.service';

const ORDRE: Record<NiveauAlerte, number> = { danger: 0, attention: 1, info: 2 };

/** Contrôles de cohérence (doubles comptages, dépassements, stocks…). */
@Injectable({ providedIn: 'root' })
export class ControlesService {
  private readonly store = inject(ChantierStore);
  private readonly budget = inject(BudgetService);
  private readonly stocks = inject(AchatsStocksService);

  /** Ne lit que les données utiles : modifier le plan d'épargne ou les paramètres ne relance pas les contrôles. */
  private readonly donnees = computed<DonneesControles>(() => ({ ...this.store.donneesBudget(), revenus: this.store.revenus() }));

  readonly alertes = computed(() =>
    genererAlertes(this.donnees(), this.budget.synthese(), this.stocks.etats()).sort(
      (a, b) => ORDRE[a.niveau] - ORDRE[b.niveau],
    ),
  );

  private readonly parModule = computed(() => grouperPar(this.alertes(), (a) => a.module));

  alertesDuModule(...modules: string[]): Alerte[] {
    const index = this.parModule();
    return modules.flatMap((m) => index.get(m) ?? []);
  }
}
