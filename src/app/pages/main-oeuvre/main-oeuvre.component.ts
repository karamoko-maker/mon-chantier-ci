import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { METIERS } from '../../core/constantes';
import { telechargerCsv } from '../../core/calculs/csv';
import { aujourdhuiISO } from '../../core/calculs/dates';
import { montantConvenuIntervention } from '../../core/calculs/main-oeuvre.calc';
import { resteAPayer, somme } from '../../core/calculs/montants';
import { EnveloppeMainOeuvre, Intervention, ModeRemuneration } from '../../core/models';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { ControlesService } from '../../core/services/controles.service';
import { MainOeuvreService } from '../../core/services/main-oeuvre.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParametresService } from '../../core/services/parametres.service';
import { PhasesService } from '../../core/services/phases.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';
import { signalFormulaire, valeurChamp } from '../../shared/formulaires';

type Onglet = 'interventions' | 'enveloppes' | 'recap';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-main-oeuvre',
  imports: [ReactiveFormsModule, BandeauComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './main-oeuvre.component.html',
})
export class MainOeuvreComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(MainOeuvreService);
  protected readonly phases = inject(PhasesService);
  private readonly parametres = inject(ParametresService);
  private readonly controles = inject(ControlesService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly metiers = METIERS;
  protected readonly onglet = signal<Onglet>('interventions');
  protected readonly filtreMetier = signal('');
  protected readonly filtrePhase = signal('');
  protected readonly editionId = signal<string | null>(null);
  protected readonly formulaireVisible = signal(false);
  protected readonly alertes = computed(() => this.controles.alertesDuModule("Main-d'œuvre"));

  protected readonly interventions = computed(() =>
    this.service
      .interventions()
      .filter(
        (x) =>
          (!this.filtreMetier() || x.intervention.metier === this.filtreMetier()) &&
          (!this.filtrePhase() || (x.intervention.phaseId ?? '') === this.filtrePhase()),
      ),
  );

  protected readonly totaux = computed(() => {
    const l = this.interventions();
    const convenu = somme(l, (x) => x.convenu);
    const paye = somme(l, (x) => x.intervention.montantPaye);
    return { convenu, paye, reste: resteAPayer(convenu, paye) };
  });

  protected readonly totauxEnveloppes = computed(() => {
    const l = this.service.enveloppes();
    return {
      min: somme(l, (x) => x.enveloppe.montantMin),
      max: somme(l, (x) => x.enveloppe.montantMax),
      comptees: somme(l.filter((x) => x.comptee), (x) => x.enveloppe.montantRetenu),
    };
  });

  protected readonly totalRecap = computed(() => {
    const l = this.service.recapParMetier();
    return {
      convenu: somme(l, (x) => x.convenu),
      enveloppes: somme(l, (x) => x.enveloppes),
      paye: somme(l, (x) => x.paye),
      reste: somme(l, (x) => x.reste),
    };
  });

  protected readonly form = this.fb.group({
    metier: [METIERS[0], Validators.required],
    prestataire: [''],
    phaseId: [''],
    date: [aujourdhuiISO(), Validators.required],
    mode: ['journalier' as ModeRemuneration, Validators.required],
    nombrePersonnes: [1, [Validators.required, Validators.min(1)]],
    tarifJournalier: [0, [Validators.required, Validators.min(0)]],
    nombreJours: [1, [Validators.required, Validators.min(0)]],
    heuresSupplementaires: [0, [Validators.required, Validators.min(0)]],
    tarifHoraireSup: [0, [Validators.required, Validators.min(0)]],
    montantForfait: [0, [Validators.required, Validators.min(0)]],
    prestationsCouvertes: [[] as string[]],
    montantPaye: [0, [Validators.required, Validators.min(0)]],
    commentaire: [''],
  });

  protected readonly formEnveloppe = this.fb.group({
    metier: [METIERS[0], Validators.required],
    montantMin: [0, [Validators.required, Validators.min(0)]],
    montantMax: [0, [Validators.required, Validators.min(0)]],
    phaseId: [''],
  });

  private readonly valeurs = signalFormulaire(this.form);
  /** Aperçu en direct du montant convenu et du reste à payer (recalculé seulement quand un champ change). */
  protected readonly apercu = computed(() => {
    const v = this.valeurs();
    const convenu = montantConvenuIntervention(this.versIntervention(v));
    return { convenu, reste: resteAPayer(convenu, Number(v.montantPaye) || 0) };
  });

  private versIntervention(v: ReturnType<MainOeuvreComponent['form']['getRawValue']>): Omit<Intervention, 'id'> {
    const forfait = v.mode === 'forfait';
    return {
      metier: v.metier!,
      prestataire: (v.prestataire ?? '').trim(),
      phaseId: v.phaseId || null,
      date: v.date!,
      mode: v.mode!,
      nombrePersonnes: forfait ? 0 : Number(v.nombrePersonnes),
      tarifJournalier: forfait ? 0 : Number(v.tarifJournalier),
      nombreJours: forfait ? 0 : Number(v.nombreJours),
      heuresSupplementaires: forfait ? 0 : Number(v.heuresSupplementaires),
      tarifHoraireSup: forfait ? 0 : Number(v.tarifHoraireSup),
      montantForfait: forfait ? Number(v.montantForfait) : 0,
      prestationsCouvertes: forfait ? (v.prestationsCouvertes ?? []).filter((m) => m !== v.metier) : [],
      montantPaye: Number(v.montantPaye),
      commentaire: v.commentaire ?? '',
    };
  }

  protected changerMetier(): void {
    // Pré-remplit le tarif journalier de référence défini dans les paramètres.
    if (this.editionId()) return;
    const tarif = this.parametres.tarifDe(this.form.controls.metier.value ?? '');
    if (tarif > 0) this.form.controls.tarifJournalier.setValue(tarif);
  }

  protected basculerCouverture(metier: string, e: Event): void {
    const actuel = this.form.controls.prestationsCouvertes.value ?? [];
    const coche = (e.target as HTMLInputElement).checked;
    this.form.controls.prestationsCouvertes.setValue(coche ? [...actuel, metier] : actuel.filter((m) => m !== metier));
  }

  protected ouvrirAjout(): void {
    this.editionId.set(null);
    this.form.reset({
      metier: METIERS[0], prestataire: '', phaseId: '', date: aujourdhuiISO(), mode: 'journalier', nombrePersonnes: 1,
      tarifJournalier: this.parametres.tarifDe(METIERS[0]), nombreJours: 1, heuresSupplementaires: 0, tarifHoraireSup: 0,
      montantForfait: 0, prestationsCouvertes: [], montantPaye: 0, commentaire: '',
    });
    this.formulaireVisible.set(true);
  }

  protected ouvrirModification(i: Intervention): void {
    this.editionId.set(i.id);
    this.form.reset({ ...i, phaseId: i.phaseId ?? '', prestationsCouvertes: [...i.prestationsCouvertes] });
    this.formulaireVisible.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected annuler(): void {
    this.formulaireVisible.set(false);
    this.editionId.set(null);
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.erreur('Veuillez corriger les champs signalés.');
      return;
    }
    const donnees = this.versIntervention(this.form.getRawValue());
    const id = this.editionId();
    if (id) {
      this.service.modifierIntervention(id, donnees);
      this.notifications.succes('Intervention modifiée.');
    } else {
      this.service.ajouterIntervention(donnees);
      this.notifications.succes('Intervention enregistrée.');
    }
    this.annuler();
  }

  protected async supprimer(i: Intervention): Promise<void> {
    const ok = await this.confirmation.confirmer({
      message: `Supprimer l'intervention « ${i.metier}${i.prestataire ? ' — ' + i.prestataire : ''} » ?`,
      libelleConfirmer: 'Supprimer',
    });
    if (ok) {
      this.service.supprimerIntervention(i.id);
      this.notifications.succes('Intervention supprimée.');
    }
  }

  // ----- Enveloppes -----
  protected ajouterEnveloppe(): void {
    const v = this.formEnveloppe.getRawValue();
    if (this.formEnveloppe.invalid || Number(v.montantMax) < Number(v.montantMin)) {
      this.formEnveloppe.markAllAsTouched();
      this.notifications.erreur('Le montant maximum doit être supérieur ou égal au minimum.');
      return;
    }
    const min = Number(v.montantMin);
    const max = Number(v.montantMax);
    this.service.ajouterEnveloppe({
      metier: v.metier!, montantMin: min, montantMax: max, montantRetenu: Math.round((min + max) / 2),
      phaseId: v.phaseId || null, inclureAuBudget: true,
    });
    this.formEnveloppe.reset({ metier: METIERS[0], montantMin: 0, montantMax: 0, phaseId: '' });
    this.notifications.succes('Enveloppe ajoutée.');
  }

  protected modifierEnveloppe(e: EnveloppeMainOeuvre, champ: 'montantMin' | 'montantMax' | 'montantRetenu' | 'phaseId' | 'inclureAuBudget', ev: Event): void {
    const cible = ev.target as HTMLInputElement;
    if (champ === 'inclureAuBudget') {
      this.service.modifierEnveloppe(e.id, { inclureAuBudget: cible.checked });
      return;
    }
    if (champ === 'phaseId') {
      this.service.modifierEnveloppe(e.id, { phaseId: cible.value || null });
      return;
    }
    const n = Number(cible.value);
    if (!Number.isFinite(n) || n < 0) {
      this.notifications.erreur('Montant invalide.');
      return;
    }
    this.service.modifierEnveloppe(e.id, { [champ]: Math.round(n) });
    const maj = { ...e, [champ]: Math.round(n) };
    if (maj.montantRetenu < maj.montantMin || maj.montantRetenu > maj.montantMax) {
      this.notifications.info('Le montant retenu est en dehors de la fourchette indicative.');
    }
  }

  protected async supprimerEnveloppe(e: EnveloppeMainOeuvre): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer l'enveloppe « ${e.metier} » ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimerEnveloppe(e.id);
      this.notifications.succes('Enveloppe supprimée.');
    }
  }

  protected exporterCsv(): void {
    telechargerCsv(
      `main-oeuvre-${aujourdhuiISO()}.csv`,
      ['Date', 'Métier', 'Prestataire', 'Phase', 'Mode', 'Personnes', 'Tarif journalier', 'Jours', 'Heures sup.', 'Forfait', 'Montant convenu', 'Payé', 'Reste à payer'],
      this.interventions().map(({ intervention: i, convenu, reste }) => [
        i.date, i.metier, i.prestataire, this.phases.nom(i.phaseId), i.mode === 'forfait' ? 'Forfait' : 'Journalier',
        i.nombrePersonnes, i.tarifJournalier, i.nombreJours, i.heuresSupplementaires, i.montantForfait, convenu, i.montantPaye, reste,
      ]),
    );
  }

  protected readonly valeur = valeurChamp;
}
