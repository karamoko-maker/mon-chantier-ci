import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LIBELLES_CATEGORIE_DEPENSE, LIBELLES_ETAPE_DEPENSE, MODELES_FRAIS_ANNEXES } from '../../core/constantes';
import { telechargerCsv } from '../../core/calculs/csv';
import { aujourdhuiISO } from '../../core/calculs/dates';
import { ecartBudgetaire, nombre, somme } from '../../core/calculs/montants';
import { SourceMouvement } from '../../core/calculs/mouvements.calc';
import { formatFcfa } from '../../core/calculs/format';
import { CategorieDepense, Depense, EtapeDepense } from '../../core/models';
import { BudgetService } from '../../core/services/budget.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { ControlesService } from '../../core/services/controles.service';
import { DepensesService, EtatPaiement } from '../../core/services/depenses.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParametresService } from '../../core/services/parametres.service';
import { PhasesService } from '../../core/services/phases.service';
import { ProjetService } from '../../core/services/projet.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { CarteStatComponent } from '../../shared/components/carte-stat.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';
import { signalFormulaire, valeurChamp } from '../../shared/formulaires';

type Onglet = 'registre' | 'frais' | 'consolide';

const LIBELLES_PAIEMENT: Record<EtatPaiement, string> = {
  non_paye: 'Non payé',
  partiel: 'Partiellement payé',
  paye: 'Payé',
  depasse: 'Payé au-delà du prévu',
};

const LIBELLES_SOURCE: Record<SourceMouvement, string> = {
  achat: 'Achat de matériaux',
  main_oeuvre: "Main-d'œuvre",
  equipement: 'Équipement',
  depense: 'Dépense / frais',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-depenses',
  imports: [ReactiveFormsModule, RouterLink, BandeauComponent, CarteStatComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './depenses.component.html',
})
export class DepensesComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(DepensesService);
  protected readonly phases = inject(PhasesService);
  protected readonly parametres = inject(ParametresService);
  protected readonly projet = inject(ProjetService);
  private readonly budget = inject(BudgetService);
  private readonly controles = inject(ControlesService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly categories = LIBELLES_CATEGORIE_DEPENSE;
  protected readonly listeCategories = Object.entries(LIBELLES_CATEGORIE_DEPENSE) as [CategorieDepense, string][];
  protected readonly etapes = LIBELLES_ETAPE_DEPENSE;
  protected readonly listeEtapes = Object.entries(LIBELLES_ETAPE_DEPENSE) as [EtapeDepense, string][];
  protected readonly paiements = LIBELLES_PAIEMENT;
  protected readonly sources = LIBELLES_SOURCE;
  protected readonly modeles = MODELES_FRAIS_ANNEXES;
  protected readonly fcfa = formatFcfa;
  protected readonly s = this.budget.synthese;

  protected readonly onglet = signal<Onglet>('registre');
  protected readonly recherche = signal('');
  protected readonly filtreCategorie = signal('');
  protected readonly filtrePhase = signal('');
  protected readonly filtreSource = signal('');
  protected readonly editionId = signal<string | null>(null);
  protected readonly formulaireVisible = signal(false);
  protected readonly alertes = computed(() => this.controles.alertesDuModule('Dépenses'));

  protected readonly registre = computed(() => {
    const r = this.recherche().trim().toLowerCase();
    return this.service
      .depenses()
      .filter(
        (x) =>
          (!r || x.depense.description.toLowerCase().includes(r) || x.depense.beneficiaire.toLowerCase().includes(r) || x.depense.reference.toLowerCase().includes(r)) &&
          (!this.filtreCategorie() || x.depense.categorie === this.filtreCategorie()) &&
          (!this.filtrePhase() || x.depense.phaseId === this.filtrePhase()),
      );
  });

  protected readonly totauxRegistre = computed(() => {
    const l = this.registre();
    const prevu = somme(l, (x) => x.depense.montantPrevu);
    const paye = somme(l, (x) => x.depense.montantPaye);
    return { prevu, paye, ecart: ecartBudgetaire(paye, prevu), engage: somme(l, (x) => x.engage) };
  });

  protected readonly depassements = computed(() => this.service.depenses().filter((x) => x.ecart > 0));
  protected readonly economies = computed(() =>
    this.service.depenses().filter((x) => x.depense.etape === 'facturee' && x.depense.montantPaye > 0 && x.ecart < 0),
  );

  protected readonly mouvements = computed(() =>
    [...this.service.mouvements()]
      .filter((m) => (!this.filtreSource() || m.source === this.filtreSource()) && (!this.filtrePhase() || m.phaseId === this.filtrePhase()))
      .reverse(),
  );
  protected readonly totauxMouvements = computed(() => ({
    engage: somme(this.mouvements(), (m) => m.engage),
    paye: somme(this.mouvements(), (m) => m.paye),
  }));

  protected readonly form = this.fb.group({
    date: [aujourdhuiISO(), Validators.required],
    categorie: ['transport' as CategorieDepense, Validators.required],
    phaseId: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    montantPrevu: [0, [Validators.required, Validators.min(0)]],
    montantPaye: [0, [Validators.required, Validators.min(0)]],
    etape: ['prevue' as EtapeDepense, Validators.required],
    moyenPaiement: [''],
    beneficiaire: [''],
    reference: [''],
    commentaire: [''],
  });

  private readonly valeurs = signalFormulaire(this.form);
  /** Écart budgétaire de la dépense en cours de saisie. */
  protected readonly apercuEcart = computed(() => {
    const v = this.valeurs();
    return ecartBudgetaire(nombre(v.montantPaye), nombre(v.montantPrevu));
  });

  protected ouvrirAjout(modele?: { libelle: string; categorie: CategorieDepense }): void {
    this.editionId.set(null);
    this.form.reset({
      date: aujourdhuiISO(), categorie: modele?.categorie ?? 'transport', phaseId: this.budget.synthese().phaseActuelle?.phase.id ?? '',
      description: modele?.libelle ?? '', montantPrevu: 0, montantPaye: 0, etape: 'prevue',
      moyenPaiement: this.parametres.modesPaiement()[0] ?? '', beneficiaire: '', reference: '', commentaire: '',
    });
    this.formulaireVisible.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected ouvrirModification(d: Depense): void {
    this.editionId.set(d.id);
    this.form.reset({ ...d, phaseId: d.phaseId ?? '' });
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
      this.notifications.erreur('Veuillez corriger les champs signalés (la phase est obligatoire).');
      return;
    }
    const v = this.form.getRawValue();
    const donnees: Omit<Depense, 'id'> = {
      date: v.date!,
      categorie: v.categorie!,
      phaseId: v.phaseId || null,
      description: v.description!.trim(),
      montantPrevu: Math.round(Number(v.montantPrevu)),
      montantPaye: Math.round(Number(v.montantPaye)),
      etape: v.etape!,
      moyenPaiement: v.moyenPaiement ?? '',
      beneficiaire: (v.beneficiaire ?? '').trim(),
      reference: (v.reference ?? '').trim(),
      commentaire: v.commentaire ?? '',
    };
    const id = this.editionId();
    if (id) {
      this.service.modifier(id, donnees);
      this.notifications.succes('Dépense modifiée.');
    } else {
      this.service.ajouter(donnees);
      this.notifications.succes('Dépense enregistrée.');
    }
    this.annuler();
  }

  protected async supprimer(d: Depense): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer la dépense « ${d.description} » ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimer(d.id);
      this.notifications.succes('Dépense supprimée.');
    }
  }

  protected modifierReserve(e: Event): void {
    const pct = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
      this.notifications.erreur('Le pourcentage de réserve doit être compris entre 0 et 50 %.');
      return;
    }
    this.projet.mettreAJour({ pourcentageReserve: pct });
    this.notifications.succes(`Réserve pour imprévus fixée à ${pct} %.`);
  }

  protected exporterCsv(): void {
    if (this.onglet() === 'consolide') {
      telechargerCsv(
        `paiements-consolides-${aujourdhuiISO()}.csv`,
        ['Date', 'Source', 'Libellé', 'Phase', 'Engagé (FCFA)', 'Payé (FCFA)', 'Bénéficiaire', 'Référence'],
        this.mouvements().map((m) => [m.date, LIBELLES_SOURCE[m.source], m.libelle, this.phases.nom(m.phaseId), m.engage, m.paye, m.beneficiaire, m.reference]),
      );
      return;
    }
    telechargerCsv(
      `registre-depenses-${aujourdhuiISO()}.csv`,
      ['Date', 'Catégorie', 'Phase', 'Description', 'Montant prévu', 'Montant payé', 'Écart', 'Étape', 'Paiement', 'Moyen de paiement', 'Bénéficiaire', 'Justificatif', 'Commentaire'],
      this.registre().map(({ depense: d, ecart, paiement }) => [
        d.date, LIBELLES_CATEGORIE_DEPENSE[d.categorie], this.phases.nom(d.phaseId), d.description, d.montantPrevu, d.montantPaye, ecart,
        LIBELLES_ETAPE_DEPENSE[d.etape], LIBELLES_PAIEMENT[paiement], d.moyenPaiement, d.beneficiaire, d.reference, d.commentaire,
      ]),
    );
  }

  protected readonly valeur = valeurChamp;
}
