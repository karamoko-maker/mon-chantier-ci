import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bandeau d'information, d'avertissement ou d'erreur. */
@Component({
  selector: 'app-bandeau',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bandeau" [class]="'bandeau ' + niveau()" role="status">
      <span class="icone" aria-hidden="true">{{ niveau() === 'info' ? 'ℹ' : '⚠' }}</span>
      <div><ng-content /></div>
    </div>
  `,
  styles: `
    .bandeau {
      display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.65rem 0.9rem; border-radius: 8px;
      font-size: 0.9rem; border: 1px solid; margin-bottom: 1rem;
    }
    .icone { font-weight: 700; line-height: 1.4; }
    .info { background: var(--bleu-50); border-color: var(--bleu-100); color: var(--bleu-800); }
    .attention { background: var(--orange-fond); border-color: #f3d29c; color: #7a4304; }
    .danger { background: var(--rouge-fond); border-color: #f2c1bc; color: #8f1c13; }
  `,
})
export class BandeauComponent {
  readonly niveau = input<'info' | 'attention' | 'danger'>('info');
}
