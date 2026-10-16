import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Barre de progression en pourcentage. */
@Component({
  selector: 'app-progression',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="progression" [attr.aria-label]="'Avancement ' + arrondi() + ' %'">
      <div class="barre"><span [style.width.%]="arrondi()"></span></div>
      <small>{{ arrondi() }} %</small>
    </div>
  `,
})
export class ProgressionComponent {
  readonly valeur = input<number>(0);
  readonly arrondi = computed(() => Math.max(0, Math.min(100, Math.round(this.valeur() || 0))));
}
