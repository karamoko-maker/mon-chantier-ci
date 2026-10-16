import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MENTION_ESTIMATION } from '../../core/constantes';
import { aujourdhuiISO } from '../../core/calculs/dates';
import { Projet } from '../../core/models';
import { BudgetService } from '../../core/services/budget.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProjetService } from '../../core/services/projet.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-projet',
  imports: [ReactiveFormsModule, RouterLink, BandeauComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './projet.component.html',
})
export class ProjetComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(ProjetService);
  protected readonly budget = inject(BudgetService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mention = MENTION_ESTIMATION;

  protected readonly form = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(120)]],
    typeBatiment: ['', Validators.required],
    pays: ['', Validators.required],
    ville: ['', Validators.required],
    commune: [''],
    devise: [{ value: '', disabled: true }],
    surfaceTerrain: [0, [Validators.required, Validators.min(1)]],
    surfaceConstructible: [null as number | null, Validators.min(0)],
    surfaceConstruiteEstimee: [null as number | null, Validators.min(0)],
    nombreEtages: [3, [Validators.required, Validators.min(0), Validators.max(20)]],
    styleArchitectural: [''],
    configurationLogements: [''],
    nombreLogements: [null as number | null, Validators.min(0)],
    dateDebutPrevue: [null as string | null],
    pourcentageReserve: [10, [Validators.required, Validators.min(0), Validators.max(50)]],
    descriptif: [''],
  });

  protected readonly validation = this.fb.group({
    metreValidePar: ['', Validators.required],
    metreValideLe: [aujourdhuiISO(), Validators.required],
  });

  constructor() {
    this.charger();
  }

  protected charger(): void {
    const p = this.service.projet();
    this.form.reset({ ...p, dateDebutPrevue: p.dateDebutPrevue });
    this.validation.reset({ metreValidePar: p.metreValidePar, metreValideLe: p.metreValideLe ?? aujourdhuiISO() });
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.erreur('Veuillez corriger les champs signalés en rouge.');
      return;
    }
    const v = this.form.getRawValue();
    this.service.mettreAJour({
      ...(v as Partial<Projet>),
      nom: v.nom!.trim(),
      surfaceTerrain: Number(v.surfaceTerrain),
      nombreEtages: Number(v.nombreEtages),
      pourcentageReserve: Number(v.pourcentageReserve),
      dateDebutPrevue: v.dateDebutPrevue || null,
    });
    this.form.markAsPristine();
    this.notifications.succes('Caractéristiques du projet enregistrées.');
  }

  protected annuler(): void {
    this.charger();
    this.notifications.info('Modifications annulées.');
  }

  protected validerMetre(): void {
    if (this.validation.invalid) {
      this.validation.markAllAsTouched();
      return;
    }
    const v = this.validation.getRawValue();
    this.service.mettreAJour({ metreValide: true, metreValidePar: v.metreValidePar!.trim(), metreValideLe: v.metreValideLe });
    this.notifications.succes('Validation du métré enregistrée. La mention « estimation indicative » est retirée des rapports.');
  }

  protected async annulerValidation(): Promise<void> {
    const ok = await this.confirmation.confirmer({
      titre: 'Retirer la validation',
      message: 'Le métré sera de nouveau considéré comme non validé et les rapports porteront la mention « estimation indicative ».',
      libelleConfirmer: 'Retirer la validation',
    });
    if (ok) {
      this.service.mettreAJour({ metreValide: false });
      this.notifications.info('Validation retirée.');
    }
  }
}
