import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LIBELLES_STATUT_PHASE, LIBELLES_TRANCHE } from '../../core/constantes';
import { somme } from '../../core/calculs/montants';
import { StatutPhase, Tranche } from '../../core/models';
import { BudgetService } from '../../core/services/budget.service';
import { FinancementService } from '../../core/services/financement.service';
import { NotificationService } from '../../core/services/notification.service';
import { PhasesService } from '../../core/services/phases.service';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { ProgressionComponent } from '../../shared/components/progression.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';
import { valeurChamp } from '../../shared/formulaires';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-phases',
  imports: [ReactiveFormsModule, RouterLink, ProgressionComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './phases.component.html',
  styles: `
    .tranche { display: flex; flex-direction: column; gap: 0.25rem; text-align: left; cursor: pointer; font: inherit; color: inherit; }
    .tranche.active { outline: 2px solid var(--bleu-600); }
    .tranche strong { color: var(--bleu-900); }
  `,
})
export class PhasesComponent {
  private readonly budget = inject(BudgetService);
  private readonly service = inject(PhasesService);
  private readonly financement = inject(FinancementService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly statuts = LIBELLES_STATUT_PHASE;
  protected readonly listeStatuts = Object.entries(LIBELLES_STATUT_PHASE) as [StatutPhase, string][];
  protected readonly tranches = LIBELLES_TRANCHE;
  protected readonly listeTranches: Tranche[] = [1, 2, 3];

  protected readonly recherche = signal('');
  protected readonly filtreTranche = signal<string>('');
  protected readonly filtreStatut = signal<string>('');
  protected readonly formulaireVisible = signal(false);

  protected readonly lignes = computed(() => {
    const r = this.recherche().trim().toLowerCase();
    return this.budget
      .synthese()
      .phases.filter(
        (p) =>
          (!r || p.phase.nom.toLowerCase().includes(r) || p.phase.niveau.toLowerCase().includes(r)) &&
          (!this.filtreTranche() || String(p.phase.tranche) === this.filtreTranche()) &&
          (!this.filtreStatut() || p.phase.statut === this.filtreStatut()),
      )
      .map((p) => ({ ...p, financable: this.financement.moisFinancable(p.phase.id) }));
  });

  protected readonly totaux = computed(() => {
    const l = this.lignes();
    return {
      estimatif: somme(l, (p) => p.estimatif),
      reference: somme(l, (p) => p.reference),
      paye: somme(l, (p) => p.paye),
      ecart: somme(l, (p) => p.ecart),
    };
  });

  protected readonly parTranche = computed(() =>
    this.listeTranches.map((t) => {
      const phases = this.budget.synthese().phases.filter((p) => p.phase.tranche === t);
      return {
        tranche: t,
        libelle: LIBELLES_TRANCHE[t],
        nombre: phases.length,
        terminees: phases.filter((p) => p.phase.statut === 'termine').length,
        reference: somme(phases, (p) => p.reference),
        paye: somme(phases, (p) => p.paye),
      };
    }),
  );

  protected readonly nonAffecte = computed(() => this.budget.synthese().nonAffecte);

  protected readonly form = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(150)]],
    niveau: ['', Validators.required],
    tranche: [1 as Tranche, Validators.required],
  });

  protected ouvrirAjout(): void {
    this.form.reset({ nom: '', niveau: '', tranche: 1 });
    this.formulaireVisible.set(true);
  }

  protected ajouter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.service.ajouter({
      ordre: this.service.prochainOrdre(),
      nom: v.nom!.trim(),
      niveau: v.niveau!.trim(),
      tranche: Number(v.tranche) as Tranche,
      dateDebut: null,
      dateFin: null,
      statut: 'a_faire',
      avancement: 0,
      budgetValide: null,
      autresCouts: 0,
      observations: '',
    });
    this.formulaireVisible.set(false);
    this.notifications.succes('Phase ajoutée.');
    void this.router.navigate(['/phases', id]);
  }

  protected changerStatut(id: string, statut: string): void {
    const modifs: { statut: StatutPhase; avancement?: number } = { statut: statut as StatutPhase };
    if (statut === 'termine') modifs.avancement = 100;
    this.service.modifier(id, modifs);
    this.notifications.succes(`Statut mis à jour : ${LIBELLES_STATUT_PHASE[statut as StatutPhase]}.`);
  }

  protected readonly valeur = valeurChamp;
}
