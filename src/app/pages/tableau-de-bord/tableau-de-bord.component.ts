import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { LIBELLES_POSTE, LIBELLES_STATUT_PHASE, MENTION_ESTIMATION, PosteBudget } from '../../core/constantes';
import { formatFcfa, formatMois, formatPourcent } from '../../core/calculs/format';
import { evolutionPaiements } from '../../core/calculs/mouvements.calc';
import { BudgetService } from '../../core/services/budget.service';
import { ControlesService } from '../../core/services/controles.service';
import { FinancementService } from '../../core/services/financement.service';
import { ProjetService } from '../../core/services/projet.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { CarteStatComponent } from '../../shared/components/carte-stat.component';
import { COULEURS, GraphiqueComponent, optionsMontants } from '../../shared/components/graphique.component';
import { ProgressionComponent } from '../../shared/components/progression.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tableau-de-bord',
  imports: [RouterLink, CarteStatComponent, BandeauComponent, GraphiqueComponent, ProgressionComponent, ...PIPES_FORMAT],
  templateUrl: './tableau-de-bord.component.html',
  styleUrl: './tableau-de-bord.component.css',
})
export class TableauDeBordComponent {
  private readonly budget = inject(BudgetService);
  protected readonly financement = inject(FinancementService);
  protected readonly projet = inject(ProjetService);
  private readonly controles = inject(ControlesService);

  protected readonly s = this.budget.synthese;
  protected readonly mention = MENTION_ESTIMATION;
  protected readonly statuts = LIBELLES_STATUT_PHASE;
  protected readonly fcfa = formatFcfa;
  protected readonly pourcent = formatPourcent;

  protected readonly alertes = computed(() => this.controles.alertes().slice(0, 8));
  protected readonly nombreAlertes = computed(() => this.controles.alertes().length);
  protected readonly depassements = computed(() => this.s().phases.filter((p) => p.depassement !== 'aucun'));

  protected readonly prochains = computed(() =>
    this.s().prochainesPhases.map((p) => ({ ...p, financable: this.financement.moisFinancable(p.phase.id) })),
  );

  protected readonly graphiqueRepartition = computed<ChartConfiguration>(() => {
    const s = this.s();
    const postes = (Object.keys(s.postes) as PosteBudget[]).filter((k) => s.postes[k] > 0);
    return {
      type: 'doughnut',
      data: {
        labels: [...postes.map((k) => LIBELLES_POSTE[k]), `Réserve imprévus (${s.pourcentageReserve} %)`],
        datasets: [
          {
            data: [...postes.map((k) => s.postes[k]), s.reserveReference],
            backgroundColor: COULEURS,
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: { ...optionsMontants(false), cutout: '62%' } as ChartConfiguration['options'],
    };
  });

  protected readonly evolution = computed(() => evolutionPaiements(this.s().mouvements));

  protected readonly graphiqueEvolution = computed<ChartConfiguration>(() => {
    const pts = this.evolution();
    return {
      type: 'line',
      data: {
        labels: pts.map((p) => formatMois(p.mois)),
        datasets: [
          {
            label: 'Paiements cumulés',
            data: pts.map((p) => p.payeCumule),
            borderColor: COULEURS[0],
            backgroundColor: 'rgba(23, 64, 111, 0.12)',
            fill: true,
            tension: 0.25,
          },
          {
            label: 'Paiements du mois',
            data: pts.map((p) => p.payeDuMois),
            borderColor: COULEURS[2],
            backgroundColor: COULEURS[2],
            tension: 0.25,
          },
        ],
      },
      options: optionsMontants(),
    };
  });

  protected readonly graphiqueComparaison = computed<ChartConfiguration>(() => {
    const s = this.s();
    const cles: (PosteBudget | 'imprevus')[] = ['materiaux', 'equipements', 'mainOeuvre', 'transport', 'fraisAnnexes', 'imprevus'];
    const prevu = (k: PosteBudget | 'imprevus') => (k === 'imprevus' ? s.reserveReference : s.postes[k]);
    const reel = (m: typeof s.engage, k: PosteBudget | 'imprevus') => (k === 'autres' ? 0 : m[k]);
    return {
      type: 'bar',
      data: {
        labels: cles.map((k) => LIBELLES_POSTE[k]),
        datasets: [
          { label: 'Budget prévu', data: cles.map(prevu), backgroundColor: COULEURS[0], borderRadius: 4 },
          { label: 'Engagé', data: cles.map((k) => reel(s.engage, k)), backgroundColor: COULEURS[5], borderRadius: 4 },
          { label: 'Payé', data: cles.map((k) => reel(s.paye, k)), backgroundColor: COULEURS[2], borderRadius: 4 },
        ],
      },
      options: optionsMontants(),
    };
  });
}
