import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_VERSION, LIBELLES_ORIGINE_PRIX } from '../../core/constantes';
import { ChantierStore } from '../../core/persistence/chantier-store.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { MateriauxService } from '../../core/services/materiaux.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParametresService } from '../../core/services/parametres.service';
import { RapportsService } from '../../core/services/rapports.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';

type Liste = 'unites' | 'categoriesMateriaux' | 'modesPaiement';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-parametres',
  imports: [RouterLink, BandeauComponent, ...PIPES_FORMAT],
  templateUrl: './parametres.component.html',
})
export class ParametresComponent {
  protected readonly parametres = inject(ParametresService);
  protected readonly materiaux = inject(MateriauxService);
  protected readonly store = inject(ChantierStore);
  private readonly rapports = inject(RapportsService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly version = APP_VERSION;
  protected readonly origines = LIBELLES_ORIGINE_PRIX;
  protected readonly importEnCours = signal(false);

  protected readonly listes: { cle: Liste; titre: string; aide: string }[] = [
    { cle: 'unites', titre: 'Unités de mesure', aide: 'Sac, tonne, kg, m³, unité, rouleau, mètre linéaire…' },
    { cle: 'categoriesMateriaux', titre: 'Catégories de matériaux', aide: 'Utilisées pour classer et filtrer le catalogue.' },
    { cle: 'modesPaiement', titre: 'Modes de paiement', aide: 'Espèces, Mobile Money, virement…' },
  ];

  protected ajouter(liste: Liste, champ: HTMLInputElement): void {
    if (this.parametres.ajouterValeur(liste, champ.value)) {
      this.notifications.succes(`« ${champ.value.trim()} » ajouté.`);
      champ.value = '';
    } else {
      this.notifications.erreur('Valeur vide ou déjà présente.');
    }
  }

  protected async retirer(liste: Liste, valeur: string): Promise<void> {
    if (liste === 'unites' && this.parametres.uniteUtilisee(valeur)) {
      this.notifications.erreur(`L'unité « ${valeur} » est utilisée par un matériau : modifiez d'abord ce matériau.`);
      return;
    }
    const ok = await this.confirmation.confirmer({ message: `Retirer « ${valeur} » de la liste ?`, libelleConfirmer: 'Retirer' });
    if (ok) this.parametres.retirerValeur(liste, valeur);
  }

  protected valeursDe(liste: Liste): string[] {
    return this.parametres.parametres()[liste];
  }

  protected modifierTarif(metier: string, e: Event): void {
    const t = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(t) || t < 0) {
      this.notifications.erreur('Tarif invalide.');
      return;
    }
    this.parametres.definirTarif(metier, Math.round(t));
    this.notifications.succes(`Tarif journalier « ${metier} » mis à jour.`);
  }

  protected modifierPrix(id: string, nom: string, e: Event): void {
    const p = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(p) || p < 0) {
      this.notifications.erreur('Prix invalide.');
      return;
    }
    if (this.materiaux.modifierPrix(id, Math.round(p))) this.notifications.succes(`Prix de « ${nom} » mis à jour.`);
  }

  protected async enregistrerMaintenant(): Promise<void> {
    await this.store.enregistrerMaintenant();
    if (!this.store.erreurSauvegarde()) this.notifications.succes('Données enregistrées dans ce navigateur.');
  }

  protected exporter(): void {
    this.rapports.exporterJson();
    this.notifications.succes('Sauvegarde JSON téléchargée.');
  }

  protected async importer(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    const ok = await this.confirmation.confirmer({
      titre: 'Importer une sauvegarde',
      message: `Importer « ${fichier.name} » ?\nToutes les données actuelles seront REMPLACÉES. Pensez à exporter une sauvegarde avant.`,
      libelleConfirmer: 'Remplacer mes données',
    });
    if (!ok) return;
    this.importEnCours.set(true);
    try {
      const texte = await fichier.text();
      this.store.remplacer(JSON.parse(texte));
      this.notifications.succes('Sauvegarde importée avec succès.');
    } catch (err) {
      const message = err instanceof SyntaxError ? "Le fichier n'est pas un JSON valide." : (err as Error).message;
      this.notifications.erreur(`Import impossible : ${message}`);
    } finally {
      this.importEnCours.set(false);
    }
  }

  protected async reinitialiser(): Promise<void> {
    const ok = await this.confirmation.confirmer({
      titre: 'Revenir aux données initiales',
      message:
        'Toutes vos saisies (achats, dépenses, main-d’œuvre, épargne, prix modifiés…) seront EFFACÉES et remplacées par les hypothèses de départ.\nCette action est irréversible. Exportez une sauvegarde avant si nécessaire.',
      libelleConfirmer: 'Tout réinitialiser',
    });
    if (ok) {
      this.store.reinitialiser();
      this.notifications.succes('Données initiales restaurées.');
    }
  }
}
