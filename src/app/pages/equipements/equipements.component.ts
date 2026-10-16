import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LIBELLES_ETAT_EQUIPEMENT, LIBELLES_MODE_ACQUISITION } from '../../core/constantes';
import { telechargerCsv } from '../../core/calculs/csv';
import { aujourdhuiISO } from '../../core/calculs/dates';
import { coutEquipement } from '../../core/calculs/equipement.calc';
import { somme } from '../../core/calculs/montants';
import { Equipement, EtatEquipement, ModeAcquisition } from '../../core/models';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { ControlesService } from '../../core/services/controles.service';
import { EquipementsService } from '../../core/services/equipements.service';
import { NotificationService } from '../../core/services/notification.service';
import { PhasesService } from '../../core/services/phases.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { CarteStatComponent } from '../../shared/components/carte-stat.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { formatFcfa } from '../../core/calculs/format';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';
import { signalFormulaire, valeurChamp } from '../../shared/formulaires';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-equipements',
  imports: [ReactiveFormsModule, BandeauComponent, CarteStatComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './equipements.component.html',
})
export class EquipementsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EquipementsService);
  protected readonly phases = inject(PhasesService);
  private readonly controles = inject(ControlesService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly modes = LIBELLES_MODE_ACQUISITION;
  protected readonly listeModes = Object.entries(LIBELLES_MODE_ACQUISITION) as [ModeAcquisition, string][];
  protected readonly etats = LIBELLES_ETAT_EQUIPEMENT;
  protected readonly listeEtats = Object.entries(LIBELLES_ETAT_EQUIPEMENT) as [EtatEquipement, string][];
  protected readonly fcfa = formatFcfa;

  protected readonly recherche = signal('');
  protected readonly filtreMode = signal('');
  protected readonly editionId = signal<string | null>(null);
  protected readonly formulaireVisible = signal(false);
  protected readonly alertes = computed(() => this.controles.alertesDuModule('Équipements'));

  protected readonly liste = computed(() => {
    const r = this.recherche().trim().toLowerCase();
    return this.service
      .equipements()
      .filter(
        (x) =>
          (!r || x.equipement.nom.toLowerCase().includes(r) || x.equipement.fournisseur.toLowerCase().includes(r)) &&
          (!this.filtreMode() || x.equipement.mode === this.filtreMode()),
      );
  });

  protected readonly resume = computed(() => {
    const l = this.service.equipements();
    return {
      achete: somme(l.filter((x) => x.equipement.mode === 'achete'), (x) => x.cout),
      loue: somme(l.filter((x) => x.equipement.mode === 'loue'), (x) => x.cout),
      disponibles: l.filter((x) => x.equipement.mode === 'disponible').length,
      paye: somme(l, (x) => x.equipement.montantPaye),
    };
  });

  protected readonly form = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(120)]],
    mode: ['achete' as ModeAcquisition, Validators.required],
    quantite: [1, [Validators.required, Validators.min(0)]],
    prixAchatUnitaire: [0, [Validators.required, Validators.min(0)]],
    coutLocationJournalier: [0, [Validators.required, Validators.min(0)]],
    dureeLocationJours: [0, [Validators.required, Validators.min(0)]],
    etat: ['neuf' as EtatEquipement, Validators.required],
    dateAcquisition: [aujourdhuiISO() as string | null],
    fournisseur: [''],
    phaseId: [''],
    montantPaye: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  private readonly valeurs = signalFormulaire(this.form);
  /** Coût de l'équipement en cours de saisie (recalculé seulement quand un champ change). */
  protected readonly apercu = computed(() => {
    const v = this.valeurs();
    return coutEquipement({
      ...(v as unknown as Equipement),
      quantite: Number(v.quantite),
      prixAchatUnitaire: Number(v.prixAchatUnitaire),
      coutLocationJournalier: Number(v.coutLocationJournalier),
      dureeLocationJours: Number(v.dureeLocationJours),
    });
  });

  protected ouvrirAjout(): void {
    this.editionId.set(null);
    this.form.reset({
      nom: '', mode: 'achete', quantite: 1, prixAchatUnitaire: 0, coutLocationJournalier: 0, dureeLocationJours: 0,
      etat: 'neuf', dateAcquisition: aujourdhuiISO(), fournisseur: '', phaseId: this.phases.phases()[1]?.id ?? '',
      montantPaye: 0, notes: '',
    });
    this.formulaireVisible.set(true);
  }

  protected ouvrirModification(e: Equipement): void {
    this.editionId.set(e.id);
    this.form.reset({ ...e, phaseId: e.phaseId ?? '' });
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
    const v = this.form.getRawValue();
    const donnees: Omit<Equipement, 'id'> = {
      nom: v.nom!.trim(),
      mode: v.mode!,
      quantite: Number(v.quantite),
      prixAchatUnitaire: v.mode === 'achete' ? Number(v.prixAchatUnitaire) : 0,
      coutLocationJournalier: v.mode === 'loue' ? Number(v.coutLocationJournalier) : 0,
      dureeLocationJours: v.mode === 'loue' ? Number(v.dureeLocationJours) : 0,
      etat: v.etat!,
      dateAcquisition: v.dateAcquisition || null,
      fournisseur: (v.fournisseur ?? '').trim(),
      phaseId: v.phaseId || null,
      montantPaye: v.mode === 'disponible' ? 0 : Number(v.montantPaye),
      notes: v.notes ?? '',
    };
    const id = this.editionId();
    if (id) {
      this.service.modifier(id, donnees);
      this.notifications.succes('Équipement modifié.');
    } else {
      this.service.ajouter(donnees);
      this.notifications.succes('Équipement ajouté.');
    }
    this.annuler();
  }

  protected async supprimer(e: Equipement): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer « ${e.nom} » de l'inventaire ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimer(e.id);
      this.notifications.succes('Équipement supprimé.');
    }
  }

  protected exporterCsv(): void {
    telechargerCsv(
      `equipements-${aujourdhuiISO()}.csv`,
      ['Équipement', 'Mode', 'Quantité', "Prix d'achat unitaire", 'Location / jour', 'Durée (jours)', 'Coût total', 'Payé', 'État', 'Acquisition', 'Fournisseur', 'Phase'],
      this.liste().map(({ equipement: e, cout }) => [
        e.nom, LIBELLES_MODE_ACQUISITION[e.mode], e.quantite, e.prixAchatUnitaire, e.coutLocationJournalier, e.dureeLocationJours,
        cout, e.montantPaye, LIBELLES_ETAT_EQUIPEMENT[e.etat], e.dateAcquisition, e.fournisseur, this.phases.nom(e.phaseId),
      ]),
    );
  }

  protected readonly valeur = valeurChamp;
}
