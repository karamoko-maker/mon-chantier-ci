import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { formatCourt, formatFcfa } from '../../core/calculs/format';

// Seuls les éléments réellement utilisés (anneau, courbes, barres) sont chargés :
// le reste de Chart.js est éliminé du paquet final.
Chart.register(
  DoughnutController, ArcElement,
  LineController, LineElement, PointElement, Filler,
  BarController, BarElement,
  CategoryScale, LinearScale, Legend, Tooltip,
);
Chart.defaults.font.family = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
Chart.defaults.color = '#445064';
Chart.defaults.locale = 'fr-FR';

/** Options communes : montants en FCFA dans les infobulles et format court sur les axes. */
export function optionsMontants(axes = true): ChartConfiguration['options'] {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = typeof ctx.parsed === 'number' ? ctx.parsed : (ctx.parsed as { y: number }).y;
            return `${ctx.dataset.label ? ctx.dataset.label + ' : ' : ctx.label + ' : '}${formatFcfa(v)}`;
          },
        },
      },
    },
    scales: axes
      ? {
          y: { beginAtZero: true, ticks: { callback: (v) => formatCourt(Number(v)) }, grid: { color: '#eef1f5' } },
          x: { grid: { display: false } },
        }
      : undefined,
  };
}

/** Palette du projet pour les graphiques. */
export const COULEURS = ['#17406f', '#3a78c2', '#c9821f', '#2f8f6a', '#8a5bb5', '#9aa6b8', '#b42318'];

/** Enveloppe légère autour de Chart.js, compatible avec les signaux Angular. */
@Component({
  selector: 'app-graphique',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="zone" #zone><canvas #canvas [attr.aria-label]="titre()" role="img"></canvas></div>`,
  styles: `.zone { position: relative; width: 100%; }`,
})
export class GraphiqueComponent implements OnDestroy {
  readonly config = input.required<ChartConfiguration>();
  readonly hauteur = input(280);
  readonly titre = input('Graphique');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = viewChild<ElementRef<HTMLDivElement>>('zone');
  private graphique?: Chart;

  constructor() {
    effect(() => {
      const config = this.config();
      const el = this.canvas()?.nativeElement;
      const zone = this.zone()?.nativeElement;
      if (!el || !zone) return;
      // La hauteur est fixée avant la création du graphique pour que Chart.js mesure la bonne taille.
      zone.style.height = `${this.hauteur()}px`;
      if (this.graphique && (this.graphique.config as ChartConfiguration).type === config.type) {
        this.graphique.data = config.data;
        this.graphique.options = config.options ?? {};
        this.graphique.update();
      } else {
        this.graphique?.destroy();
        this.graphique = new Chart(el, config);
      }
    });
  }

  ngOnDestroy(): void {
    this.graphique?.destroy();
  }
}
