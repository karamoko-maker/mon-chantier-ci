import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NOM, APP_VERSION } from '../core/constantes';
import { ChantierStore } from '../core/persistence/chantier-store.service';
import { ControlesService } from '../core/services/controles.service';

interface EntreeMenu {
  lien: string;
  libelle: string;
  icone: string;
}

/** Tracés SVG (24×24) des icônes du menu. */
const ICONES: Record<string, string> = {
  tableau: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  projet: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3z',
  phases: 'M4 6h16M4 12h10M4 18h6',
  materiaux: 'M3 7l9-4 9 4-9 4-9-4zm0 5 9 4 9-4M3 17l9 4 9-4',
  equipements: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  mainOeuvre: 'M16 11a4 4 0 1 0-8 0M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1M7 7h10',
  achats: 'M3 4h2l2.4 11h11L21 7H6M9 20h.01M18 20h.01',
  depenses: 'M4 6h16v12H4zM4 10h16M8 15h3',
  epargne: 'M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6',
  rapports: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  parametres: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1z',
};

@Component({
  selector: 'app-menu-lateral',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="menu" [class.ouvert]="ouvert()">
      <div class="marque">
        <div class="logo" aria-hidden="true">MC</div>
        <div>
          <div class="nom">{{ nom }}</div>
          <div class="version">Version {{ version }}</div>
        </div>
      </div>
      <nav aria-label="Navigation principale">
        @for (e of entrees; track e.lien) {
          <a [routerLink]="e.lien" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: e.lien === '/' }"
             (click)="naviguer.emit()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="icones[e.icone]" /></svg>
            <span>{{ e.libelle }}</span>
            @if (e.lien === '/' && nombreAlertes() > 0) {
              <span class="pastille" [attr.aria-label]="nombreAlertes() + ' alertes importantes'">{{ nombreAlertes() }}</span>
            }
          </a>
        }
      </nav>
      <div class="pied">
        @if (store.erreurSauvegarde(); as err) {
          <div class="etat erreur">{{ err }}</div>
        } @else {
          <div class="etat">
            Enregistrement automatique
            @if (store.derniereSauvegarde(); as d) { à {{ heure(d) }} }
          </div>
        }
        <div class="lieu">{{ store.libelleStockage }}</div>
      </div>
    </aside>
  `,
  styles: `
    .menu {
      position: fixed; inset: 0 auto 0 0; width: var(--largeur-menu); background: var(--bleu-900); color: #cfdbec;
      display: flex; flex-direction: column; z-index: 800; transition: transform 0.2s ease;
    }
    .marque { display: flex; gap: 0.7rem; align-items: center; padding: 1.1rem 1rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo { width: 38px; height: 38px; border-radius: 9px; background: var(--ocre); color: #fff; font-weight: 800; display: grid; place-items: center; letter-spacing: -0.5px; }
    .nom { color: #fff; font-weight: 700; font-size: 1.02rem; }
    .version { font-size: 0.75rem; color: #8fa6c4; }
    nav { flex: 1; overflow-y: auto; padding: 0.6rem 0.5rem; }
    a {
      display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.75rem; border-radius: 8px; color: #cfdbec;
      font-weight: 500; font-size: 0.92rem; margin-bottom: 2px;
    }
    a:hover { background: rgba(255,255,255,0.07); text-decoration: none; color: #fff; }
    a.actif { background: var(--bleu-700); color: #fff; }
    svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
    .pastille { margin-left: auto; background: var(--rouge); color: #fff; border-radius: 999px; font-size: 0.72rem; font-weight: 700; padding: 0 0.45rem; }
    .pied { padding: 0.8rem 1rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.75rem; color: #8fa6c4; }
    .etat.erreur { color: #ffb4ab; }
    @media (max-width: 1023px) {
      .menu { transform: translateX(-100%); }
      .menu.ouvert { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,0.3); }
    }
  `,
})
export class MenuLateralComponent {
  readonly ouvert = input(false);
  readonly naviguer = output<void>();
  protected readonly store = inject(ChantierStore);
  private readonly controles = inject(ControlesService);
  protected readonly nom = APP_NOM;
  protected readonly version = APP_VERSION;
  protected readonly icones = ICONES;
  protected readonly nombreAlertes = computed(
    () => this.controles.alertes().filter((a) => a.niveau === 'danger').length,
  );

  protected readonly entrees: EntreeMenu[] = [
    { lien: '/', libelle: 'Tableau de bord', icone: 'tableau' },
    { lien: '/projet', libelle: 'Mon projet', icone: 'projet' },
    { lien: '/phases', libelle: 'Phases de construction', icone: 'phases' },
    { lien: '/materiaux', libelle: 'Matériaux', icone: 'materiaux' },
    { lien: '/equipements', libelle: 'Équipements', icone: 'equipements' },
    { lien: '/main-oeuvre', libelle: "Main-d'œuvre", icone: 'mainOeuvre' },
    { lien: '/achats-stocks', libelle: 'Achats et stocks', icone: 'achats' },
    { lien: '/depenses', libelle: 'Dépenses', icone: 'depenses' },
    { lien: '/epargne', libelle: 'Épargne', icone: 'epargne' },
    { lien: '/rapports', libelle: 'Rapports', icone: 'rapports' },
    { lien: '/parametres', libelle: 'Paramètres', icone: 'parametres' },
  ];

  protected heure(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
