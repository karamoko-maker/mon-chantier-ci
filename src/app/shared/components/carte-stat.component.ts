import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Carte de statistique du tableau de bord. */
@Component({
  selector: 'app-carte-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat" [class]="'stat ton-' + ton()">
      <div class="stat-libelle">{{ libelle() }}</div>
      <div class="stat-valeur">{{ valeur() }}</div>
      @if (detail()) {
        <div class="stat-detail">{{ detail() }}</div>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .stat {
      background: #fff; border: 1px solid var(--gris-200); border-radius: var(--rayon);
      box-shadow: var(--ombre); padding: 0.85rem 1rem; height: 100%; border-left: 4px solid var(--bleu-600);
    }
    .stat-libelle { font-size: 0.78rem; font-weight: 600; color: var(--gris-500); text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-valeur { font-size: 1.28rem; font-weight: 700; color: var(--bleu-900); margin-top: 0.2rem; font-variant-numeric: tabular-nums; word-break: break-word; }
    .stat-detail { font-size: 0.8rem; color: var(--gris-500); margin-top: 0.15rem; }
    .ton-vert { border-left-color: var(--vert); }
    .ton-orange { border-left-color: var(--ocre); }
    .ton-rouge { border-left-color: var(--rouge); }
    .ton-gris { border-left-color: var(--gris-300); }
    @media (max-width: 760px) { .stat { padding: 0.65rem 0.75rem; } .stat-valeur { font-size: 1.05rem; } }
  `,
})
export class CarteStatComponent {
  readonly libelle = input.required<string>();
  readonly valeur = input.required<string>();
  readonly detail = input<string>('');
  readonly ton = input<'bleu' | 'vert' | 'orange' | 'rouge' | 'gris'>('bleu');
}
