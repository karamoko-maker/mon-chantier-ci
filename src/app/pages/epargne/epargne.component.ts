import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { telechargerCsv } from '../../core/calculs/csv';
import { ajouterMois, aujourdhuiISO, moisCourant } from '../../core/calculs/dates';
import { moisPourAtteindre } from '../../core/calculs/financement.calc';
import { formatFcfa, formatMois } from '../../core/calculs/format';
import { ObjectifEpargne, RevenuExceptionnel } from '../../core/models';
import { ChantierStore } from '../../core/persistence/chantier-store.service';
import { BudgetService } from '../../core/services/budget.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { FinancementService } from '../../core/services/financement.service';
import { NotificationService } from '../../core/services/notification.service';
import { PhasesService } from '../../core/services/phases.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { CarteStatComponent } from '../../shared/components/carte-stat.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { COULEURS, GraphiqueComponent, optionsMontants } from '../../shared/components/graphique.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-epargne',
  imports: [ReactiveFormsModule, BandeauComponent, CarteStatComponent, ErreurChampComponent, GraphiqueComponent, ...PIPES_FORMAT],
  templateUrl: './epargne.component.html',
})
export class EpargneComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(FinancementService);
  protected readonly phases = inject(PhasesService);
  private readonly budget = inject(BudgetService);
  private readonly store = inject(ChantierStore);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly fcfa = formatFcfa;
  protected readonly s = this.budget.synthese;
  protected readonly formRevenuVisible = signal(false);
  protected readonly formObjectifVisible = signal(false);
  protected readonly editionRevenuId = signal<string | null>(null);
  protected readonly editionObjectifId = signal<string | null>(null);
  protected readonly calendrierComplet = signal(false);

  /** Mois estimé où tous les besoins restants seront couverts. */
  protected readonly moisFinancementTotal = computed(() => {
    const cal = this.service.calendrier();
    const m = moisPourAtteindre(cal.besoinTotal, this.service.financement(), this.store.revenus());
    return m === null ? null : { mois: m, date: ajouterMois(this.service.financement().moisDebut, m) };
  });

  protected readonly lignesCalendrier = computed(() => {
    const l = this.service.calendrier().lignes;
    return this.calendrierComplet() ? l : l.filter((x, i) => i < 12 || x.nouveauxBesoins.length > 0);
  });

  protected readonly besoinsNonFinances = computed(() => {
    const cal = this.service.calendrier();
    return this.service.besoins().filter((b) => cal.moisParBesoin.get(b.id) === null);
  });

  protected readonly graphique = computed<ChartConfiguration>(() => {
    const cal = this.service.calendrier();
    let cumul = 0;
    const besoinsCumules = this.service.besoins().map((b) => (cumul += b.montant));
    const total = besoinsCumules.at(-1) ?? 0;
    return {
      type: 'line',
      data: {
        labels: cal.lignes.map((l) => formatMois(l.mois)),
        datasets: [
          { label: 'Fonds cumulés', data: cal.lignes.map((l) => l.fondsCumules), borderColor: COULEURS[3], backgroundColor: 'rgba(47,143,106,0.12)', fill: true, tension: 0.2, pointRadius: 0 },
          { label: 'Besoins financés', data: cal.lignes.map((l) => l.besoinCumuleFinance), borderColor: COULEURS[0], backgroundColor: COULEURS[0], stepped: true, pointRadius: 0 },
          { label: 'Besoin total restant', data: cal.lignes.map(() => total), borderColor: COULEURS[6], borderDash: [6, 4], pointRadius: 0, fill: false },
        ],
      },
      options: optionsMontants(),
    };
  });

  protected readonly form = this.fb.group({
    epargneActuelle: [0, [Validators.required, Validators.min(0)]],
    capaciteMensuelle: [0, [Validators.required, Validators.min(0)]],
    reservePersonnelle: [0, [Validators.required, Validators.min(0)]],
    moisDebut: [moisCourant(), Validators.required],
    horizonMois: [36, [Validators.required, Validators.min(1), Validators.max(240)]],
    inclureReserveDansBesoins: [true],
  });

  protected readonly formRevenu = this.fb.group({
    libelle: ['', Validators.required],
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    datePrevue: [aujourdhuiISO(), Validators.required],
  });

  protected readonly formObjectif = this.fb.group({
    libelle: ['', Validators.required],
    montantManuel: [null as number | null, Validators.min(0)],
    phaseIds: [[] as string[]],
    dateSouhaitee: [null as string | null],
  });

  constructor() {
    this.chargerFinancement();
  }

  private chargerFinancement(): void {
    this.form.reset({ ...this.service.financement() });
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.erreur('Veuillez corriger les champs signalés.');
      return;
    }
    const v = this.form.getRawValue();
    this.service.mettreAJour({
      epargneActuelle: Math.round(Number(v.epargneActuelle)),
      capaciteMensuelle: Math.round(Number(v.capaciteMensuelle)),
      reservePersonnelle: Math.round(Number(v.reservePersonnelle)),
      moisDebut: v.moisDebut!,
      horizonMois: Number(v.horizonMois),
      inclureReserveDansBesoins: !!v.inclureReserveDansBesoins,
    });
    this.form.markAsPristine();
    this.notifications.succes('Plan de financement enregistré. Le calendrier a été recalculé.');
  }

  protected annuler(): void {
    this.chargerFinancement();
  }

  // ----- Revenus -----
  protected ouvrirRevenu(r?: RevenuExceptionnel): void {
    this.editionRevenuId.set(r?.id ?? null);
    this.formRevenu.reset(r ? { ...r } : { libelle: '', montant: null, datePrevue: aujourdhuiISO() });
    this.formRevenuVisible.set(true);
  }

  protected enregistrerRevenu(): void {
    if (this.formRevenu.invalid) {
      this.formRevenu.markAllAsTouched();
      return;
    }
    const v = this.formRevenu.getRawValue();
    const donnees = { libelle: v.libelle!.trim(), montant: Math.round(Number(v.montant)), datePrevue: v.datePrevue! };
    const id = this.editionRevenuId();
    if (id) this.service.modifierRevenu(id, donnees);
    else this.service.ajouterRevenu({ ...donnees, recu: false });
    this.formRevenuVisible.set(false);
    this.notifications.succes('Revenu prévu enregistré. Il ne sera compté qu’à partir de sa date.');
  }

  protected async recevoir(r: RevenuExceptionnel): Promise<void> {
    const ok = await this.confirmation.confirmer({
      titre: 'Revenu reçu',
      message: `Marquer « ${r.libelle} » comme reçu et ajouter ${formatFcfa(r.montant)} à votre épargne actuelle ?`,
      libelleConfirmer: 'Oui, ajouter à l’épargne',
      danger: false,
    });
    if (!ok) return;
    const f = this.service.financement();
    this.service.mettreAJour({ epargneActuelle: f.epargneActuelle + r.montant });
    this.service.modifierRevenu(r.id, { recu: true });
    this.form.patchValue({ epargneActuelle: f.epargneActuelle + r.montant });
    this.notifications.succes('Revenu ajouté à l’épargne actuelle.');
  }

  protected async supprimerRevenu(r: RevenuExceptionnel): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer le revenu « ${r.libelle} » ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimerRevenu(r.id);
      this.notifications.succes('Revenu supprimé.');
    }
  }

  // ----- Objectifs -----
  protected ouvrirObjectif(o?: ObjectifEpargne): void {
    this.editionObjectifId.set(o?.id ?? null);
    this.formObjectif.reset(
      o ? { ...o, phaseIds: [...o.phaseIds] } : { libelle: '', montantManuel: null, phaseIds: [], dateSouhaitee: null },
    );
    this.formObjectifVisible.set(true);
  }

  protected basculerPhase(id: string, e: Event): void {
    const actuel = this.formObjectif.controls.phaseIds.value ?? [];
    this.formObjectif.controls.phaseIds.setValue((e.target as HTMLInputElement).checked ? [...actuel, id] : actuel.filter((x) => x !== id));
  }

  protected enregistrerObjectif(): void {
    const v = this.formObjectif.getRawValue();
    const manuel = v.montantManuel === null || (v.montantManuel as unknown) === '' ? null : Math.round(Number(v.montantManuel));
    if (this.formObjectif.invalid || (manuel === null && (v.phaseIds ?? []).length === 0)) {
      this.formObjectif.markAllAsTouched();
      this.notifications.erreur('Indiquez un montant ou sélectionnez au moins une phase.');
      return;
    }
    const donnees = { libelle: v.libelle!.trim(), montantManuel: manuel, phaseIds: v.phaseIds ?? [], dateSouhaitee: v.dateSouhaitee || null };
    const id = this.editionObjectifId();
    if (id) this.service.modifierObjectif(id, donnees);
    else this.service.ajouterObjectif(donnees);
    this.formObjectifVisible.set(false);
    this.notifications.succes("Objectif d'épargne enregistré.");
  }

  protected async supprimerObjectif(o: ObjectifEpargne): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer l'objectif « ${o.libelle} » ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimerObjectif(o.id);
      this.notifications.succes('Objectif supprimé.');
    }
  }

  protected exporterCalendrier(): void {
    telechargerCsv(
      `calendrier-financement-${aujourdhuiISO()}.csv`,
      ['Mois', 'Apport épargne', 'Revenus exceptionnels', 'Fonds cumulés', 'Besoins financés (cumul)', 'Travaux finançables ce mois'],
      this.service.calendrier().lignes.map((l) => [
        formatMois(l.mois, true), l.apportEpargne, l.apportRevenus, l.fondsCumules, l.besoinCumuleFinance,
        l.nouveauxBesoins.map((b) => b.libelle).join(' | '),
      ]),
    );
  }
}
