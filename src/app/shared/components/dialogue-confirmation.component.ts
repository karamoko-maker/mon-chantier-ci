import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from '../../core/services/confirmation.service';

/** Boîte de dialogue de confirmation globale. */
@Component({
  selector: 'app-dialogue-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'service.demande() && service.repondre(false)' },
  template: `
    @if (service.demande(); as d) {
      <div class="fond" (click)="service.repondre(false)"></div>
      <div class="dialogue" role="alertdialog" aria-modal="true" [attr.aria-label]="d.titre">
        <h2>{{ d.titre }}</h2>
        <p>{{ d.message }}</p>
        <div class="boutons">
          <button type="button" class="btn" (click)="service.repondre(false)">Annuler</button>
          <button type="button" class="btn" [class.btn-plein-danger]="d.danger" [class.btn-primaire]="!d.danger"
                  (click)="service.repondre(true)" autofocus>{{ d.libelleConfirmer }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .fond { position: fixed; inset: 0; background: rgba(11, 35, 64, 0.45); z-index: 900; }
    .dialogue {
      position: fixed; z-index: 901; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(440px, calc(100vw - 2rem)); background: #fff; border-radius: 12px; padding: 1.25rem;
      box-shadow: 0 20px 50px rgba(11, 35, 64, 0.3);
    }
    p { color: var(--gris-700); white-space: pre-line; }
    .boutons { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
  `,
})
export class DialogueConfirmationComponent {
  protected readonly service = inject(ConfirmationService);
}
