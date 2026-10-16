import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

/** Affichage des messages de confirmation et d'erreur. */
@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pile" aria-live="polite">
      @for (n of service.notifications(); track n.id) {
        <div class="notif" [class]="'notif ' + n.type">
          <span>{{ n.message }}</span>
          <button type="button" (click)="service.fermer(n.id)" aria-label="Fermer">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .pile { position: fixed; bottom: 1rem; right: 1rem; z-index: 950; display: flex; flex-direction: column; gap: 0.5rem; max-width: min(420px, calc(100vw - 2rem)); }
    .notif {
      display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem;
      border-radius: 8px; color: #fff; box-shadow: 0 8px 24px rgba(11, 35, 64, 0.25); font-size: 0.9rem;
    }
    .succes { background: var(--vert); }
    .erreur { background: var(--rouge); }
    .info { background: var(--bleu-700); }
    button { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; line-height: 1; }
  `,
})
export class NotificationsComponent {
  protected readonly service = inject(NotificationService);
}
