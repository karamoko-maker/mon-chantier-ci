import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { APP_NOM, APP_VERSION } from './core/constantes';
import { MenuLateralComponent } from './layout/menu-lateral.component';
import { DialogueConfirmationComponent } from './shared/components/dialogue-confirmation.component';
import { NotificationsComponent } from './shared/components/notifications.component';

/** Coquille de l'application : menu latéral, barre mobile et zone de contenu. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MenuLateralComponent, NotificationsComponent, DialogueConfirmationComponent],
  template: `
    <header class="barre-haut">
      <button type="button" class="hamburger" (click)="menuOuvert.set(!menuOuvert())"
              [attr.aria-expanded]="menuOuvert()" aria-label="Ouvrir le menu">
        <span></span><span></span><span></span>
      </button>
      <span class="titre">{{ nom }} <small>v{{ version }}</small></span>
    </header>
    @if (menuOuvert()) {
      <div class="voile" (click)="menuOuvert.set(false)"></div>
    }
    <app-menu-lateral [ouvert]="menuOuvert()" (naviguer)="menuOuvert.set(false)" />
    <main class="contenu-principal">
      <router-outlet />
    </main>
    <app-notifications />
    <app-dialogue-confirmation />
  `,
  styles: `
    .contenu-principal { margin-left: var(--largeur-menu); min-height: 100vh; }
    .barre-haut { display: none; }
    .voile { display: none; }
    @media (max-width: 1023px) {
      .contenu-principal { margin-left: 0; }
      .barre-haut {
        display: flex; align-items: center; gap: 0.75rem; position: sticky; top: 0; z-index: 700;
        background: var(--bleu-900); color: #fff; padding: 0.6rem 0.9rem; height: 54px;
      }
      .titre { font-weight: 700; }
      .titre small { font-weight: 400; color: #8fa6c4; }
      .hamburger { background: none; border: none; padding: 8px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
      .hamburger span { display: block; width: 22px; height: 2px; background: #fff; border-radius: 2px; }
      .voile { display: block; position: fixed; inset: 0; background: rgba(11,35,64,0.4); z-index: 790; }
    }
  `,
})
export class App {
  protected readonly nom = APP_NOM;
  protected readonly version = APP_VERSION;
  protected readonly menuOuvert = signal(false);

  constructor() {
    inject(Title).setTitle(`${APP_NOM} — v${APP_VERSION}`);
  }
}
