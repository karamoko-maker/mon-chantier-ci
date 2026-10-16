import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  LIBELLES_CATEGORIE_DEPENSE,
  LIBELLES_MODE_ACQUISITION,
  LIBELLES_POSTE,
  LIBELLES_SOURCE_QUANTITE,
  LIBELLES_STATUT_PHASE,
  LIBELLES_TRANCHE,
  PosteBudget,
} from '../../core/constantes';
import { montantConvenuIntervention } from '../../core/calculs/main-oeuvre.calc';
import { montantAchat } from '../../core/calculs/stock.calc';
import { coutEquipement } from '../../core/calculs/equipement.calc';
import { SourceQuantite, StatutPhase, Tranche } from '../../core/models';
import { ChantierStore } from '../../core/persistence/chantier-store.service';
import { BudgetService } from '../../core/services/budget.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { FinancementService } from '../../core/services/financement.service';
import { MateriauxService } from '../../core/services/materiaux.service';
import { NotificationService } from '../../core/services/notification.service';
import { PhasesService } from '../../core/services/phases.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { ProgressionComponent } from '../../shared/components/progression.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';

/** La date de fin ne peut pas précéder la date de début. */
function plageDates(groupe: AbstractControl): ValidationErrors | null {
  const debut = groupe.get('dateDebut')?.value;
  const fin = groupe.get('dateFin')?.value;
  return debut && fin && fin < debut ? { plage: 'La date de fin doit être postérieure à la date de début.' } : null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-phase-detail',
  imports: [ReactiveFormsModule, RouterLink, BandeauComponent, ErreurChampComponent, ProgressionComponent, ...PIPES_FORMAT],
  templateUrl: './phase-detail.component.html',
})
export class PhaseDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ChantierStore);
  private readonly budget = inject(BudgetService);
  private readonly phases = inject(PhasesService);
  protected readonly materiaux = inject(MateriauxService);
  private readonly financement = inject(FinancementService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly listeStatuts = Object.entries(LIBELLES_STATUT_PHASE) as [StatutPhase, string][];
  protected readonly tranches = LIBELLES_TRANCHE;
  protected readonly listeTranches: Tranche[] = [1, 2, 3];
  protected readonly sources = LIBELLES_SOURCE_QUANTITE;
  protected readonly categoriesDepense = LIBELLES_CATEGORIE_DEPENSE;
  protected readonly modes = LIBELLES_MODE_ACQUISITION;
  protected readonly postesListe = (Object.keys(LIBELLES_POSTE) as (PosteBudget | 'imprevus')[]).filter(
    (k): k is PosteBudget => k !== 'imprevus',
  );
  protected readonly libellesPoste = LIBELLES_POSTE;

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  protected readonly phase = computed(() => this.phases.parId(this.id()));
  protected readonly bp = computed(() => this.budget.budgetPhase(this.id()));
  protected readonly financable = computed(() => this.financement.moisFinancable(this.id()));

  protected readonly voisines = computed(() => {
    const liste = this.phases.phases();
    const i = liste.findIndex((p) => p.id === this.id());
    return { precedente: liste[i - 1] ?? null, suivante: liste[i + 1] ?? null };
  });

  protected readonly lignes = computed(() => this.materiaux.lignes().filter((l) => l.ligne.phaseId === this.id()));
  protected readonly lignesNonReparties = computed(() =>
    this.materiaux.lignes().filter((l) => l.ligne.phaseId === null),
  );

  protected readonly lies = computed(() => {
    const id = this.id();
    const nomMat = this.materiaux.parId();
    return {
      interventions: this.store.interventions().filter((i) => i.phaseId === id).map((i) => ({ i, convenu: montantConvenuIntervention(i) })),
      depenses: this.store.depenses().filter((x) => x.phaseId === id),
      achats: this.store.achats().filter((a) => a.phaseId === id).map((a) => ({ a, nom: nomMat.get(a.materiauId)?.nom ?? '—', montant: montantAchat(a) })),
      equipements: this.store.equipements().filter((e) => e.phaseId === id).map((e) => ({ e, cout: coutEquipement(e) })),
    };
  });

  protected readonly form = this.fb.group(
    {
      ordre: [1, [Validators.required, Validators.min(1)]],
      nom: ['', [Validators.required, Validators.maxLength(150)]],
      niveau: ['', Validators.required],
      tranche: [1 as Tranche, Validators.required],
      dateDebut: [null as string | null],
      dateFin: [null as string | null],
      statut: ['a_faire' as StatutPhase, Validators.required],
      avancement: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      budgetValide: [null as number | null, Validators.min(0)],
      autresCouts: [0, [Validators.required, Validators.min(0)]],
      observations: [''],
    },
    { validators: plageDates },
  );

  protected readonly formLigne = this.fb.group({
    materiauId: ['', Validators.required],
    quantite: [null as number | null, [Validators.required, Validators.min(0)]],
    source: ['metre_ingenieur' as SourceQuantite, Validators.required],
  });

  constructor() {
    // Recharge le formulaire quand on change de phase (et non à chaque modification des données).
    effect(() => {
      const id = this.id();
      untracked(() => this.charger(id));
    });
  }

  private charger(id: string): void {
    const p = this.phases.parId(id);
    if (p) this.form.reset({ ...p });
  }

  protected enregistrer(): void {
    const p = this.phase();
    if (!p) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.erreur('Veuillez corriger les champs signalés.');
      return;
    }
    const v = this.form.getRawValue();
    const avancement = v.statut === 'termine' ? 100 : Number(v.avancement);
    this.phases.modifier(p.id, {
      ordre: Number(v.ordre),
      nom: v.nom!.trim(),
      niveau: v.niveau!.trim(),
      tranche: Number(v.tranche) as Tranche,
      dateDebut: v.dateDebut || null,
      dateFin: v.dateFin || null,
      statut: v.statut!,
      avancement,
      budgetValide: v.budgetValide === null || (v.budgetValide as unknown) === '' ? null : Number(v.budgetValide),
      autresCouts: Number(v.autresCouts),
      observations: v.observations ?? '',
    });
    this.form.patchValue({ avancement });
    this.form.markAsPristine();
    this.notifications.succes('Phase enregistrée.');
  }

  protected annuler(): void {
    this.charger(this.id());
  }

  protected async supprimer(): Promise<void> {
    const p = this.phase();
    if (!p) return;
    const n = this.phases.elementsRattaches(p.id);
    const ok = await this.confirmation.confirmer({
      titre: 'Supprimer la phase',
      message:
        `Supprimer « ${p.nom} » ?` +
        (n > 0 ? `\n${n} élément(s) rattaché(s) (matériaux, achats, dépenses…) deviendront « non affectés » ; ils ne seront pas supprimés.` : ''),
      libelleConfirmer: 'Supprimer',
    });
    if (!ok) return;
    this.phases.supprimer(p.id);
    this.notifications.succes('Phase supprimée.');
    void this.router.navigate(['/phases']);
  }

  protected ajouterLigne(): void {
    if (this.formLigne.invalid) {
      this.formLigne.markAllAsTouched();
      return;
    }
    const v = this.formLigne.getRawValue();
    this.materiaux.ajouterLigne({
      materiauId: v.materiauId!,
      phaseId: this.id(),
      quantite: Number(v.quantite),
      source: v.source!,
      valide: v.source === 'metre_ingenieur',
      inclureAuBudget: true,
      commentaire: '',
    });
    this.formLigne.reset({ materiauId: '', quantite: null, source: 'metre_ingenieur' });
    this.notifications.succes('Matériau ajouté à la phase.');
  }

  protected modifierQuantite(id: string, e: Event): void {
    const q = Number((e.target as HTMLInputElement).value);
    if (Number.isFinite(q) && q >= 0) this.materiaux.modifierLigne(id, { quantite: q });
  }

  protected basculer(id: string, champ: 'valide' | 'inclureAuBudget', e: Event): void {
    this.materiaux.modifierLigne(id, { [champ]: (e.target as HTMLInputElement).checked });
  }

  protected changerSource(id: string, e: Event): void {
    this.materiaux.modifierLigne(id, { source: (e.target as HTMLSelectElement).value as SourceQuantite });
  }

  protected affecter(ligneId: string): void {
    this.materiaux.modifierLigne(ligneId, { phaseId: this.id() });
    this.notifications.succes('Ligne affectée à cette phase.');
  }

  protected retirer(ligneId: string): void {
    this.materiaux.modifierLigne(ligneId, { phaseId: null });
    this.notifications.info("Ligne remise dans l'estimation non répartie.");
  }

  protected async supprimerLigne(ligneId: string, nom: string): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer la ligne « ${nom} » de cette phase ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.materiaux.supprimerLigne(ligneId);
      this.notifications.succes('Ligne supprimée.');
    }
  }
}
