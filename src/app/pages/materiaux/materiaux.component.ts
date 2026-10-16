import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LIBELLES_ORIGINE_PRIX, LIBELLES_SOURCE_QUANTITE, MENTION_ESTIMATION } from '../../core/constantes';
import { telechargerCsv } from '../../core/calculs/csv';
import { aujourdhuiISO } from '../../core/calculs/dates';
import { montantLigne, somme } from '../../core/calculs/montants';
import { Materiau, OriginePrix, SourceQuantite } from '../../core/models';
import { AchatsStocksService } from '../../core/services/achats-stocks.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { MateriauxService } from '../../core/services/materiaux.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParametresService } from '../../core/services/parametres.service';
import { PhasesService } from '../../core/services/phases.service';
import { ProjetService } from '../../core/services/projet.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';
import { signalFormulaire, valeurChamp } from '../../shared/formulaires';

type Onglet = 'catalogue' | 'estimation';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-materiaux',
  imports: [ReactiveFormsModule, RouterLink, BandeauComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './materiaux.component.html',
})
export class MateriauxComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(MateriauxService);
  private readonly stocksService = inject(AchatsStocksService);
  protected readonly parametres = inject(ParametresService);
  protected readonly phases = inject(PhasesService);
  protected readonly projet = inject(ProjetService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly mention = MENTION_ESTIMATION;
  protected readonly origines = Object.entries(LIBELLES_ORIGINE_PRIX) as [OriginePrix, string][];
  protected readonly libellesOrigine = LIBELLES_ORIGINE_PRIX;
  protected readonly sources = LIBELLES_SOURCE_QUANTITE;

  protected readonly onglet = signal<Onglet>('catalogue');
  protected readonly recherche = signal('');
  protected readonly filtreCategorie = signal('');
  protected readonly editionId = signal<string | null>(null);
  protected readonly formulaireVisible = signal(false);

  protected readonly catalogue = computed(() => {
    const stocks = new Map(this.stocksService.stocks().map((s) => [s.materiau.id, s]));
    const r = this.recherche().trim().toLowerCase();
    return this.service
      .materiaux()
      .filter(
        (m) =>
          (!r || m.nom.toLowerCase().includes(r) || m.fournisseur.toLowerCase().includes(r)) &&
          (!this.filtreCategorie() || m.categorie === this.filtreCategorie()),
      )
      .map((m) => ({ m, stock: stocks.get(m.id)! }));
  });

  protected readonly totalCatalogue = computed(() => somme(this.catalogue(), (l) => l.stock.montantPrevu));

  protected readonly lignes = computed(() => {
    const ordre = new Map(this.phases.phases().map((p) => [p.id, p.ordre]));
    return [...this.service.lignes()].sort(
      (a, b) => (ordre.get(a.ligne.phaseId ?? '') ?? 0) - (ordre.get(b.ligne.phaseId ?? '') ?? 0),
    );
  });
  protected readonly totauxEstimation = computed(() => {
    const l = this.service.lignes();
    const incluses = l.filter((x) => x.ligne.inclureAuBudget);
    return {
      inclus: somme(incluses, (x) => x.montant),
      nonValidees: incluses.filter((x) => !x.ligne.valide).length,
      nonReparties: incluses.filter((x) => x.ligne.phaseId === null).length,
    };
  });

  protected readonly form = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(120)]],
    categorie: ['', Validators.required],
    unite: ['', Validators.required],
    prixUnitaire: [0, [Validators.required, Validators.min(0)]],
    originePrix: ['hypothese' as OriginePrix, Validators.required],
    fournisseur: [''],
    dateMajPrix: [aujourdhuiISO() as string | null],
    seuilAlerte: [0, [Validators.required, Validators.min(0)]],
    structurel: [false],
    notes: [''],
  });

  protected readonly formLigne = this.fb.group({
    materiauId: ['', Validators.required],
    phaseId: [''],
    quantite: [null as number | null, [Validators.required, Validators.min(0)]],
    source: ['hypothese' as SourceQuantite, Validators.required],
  });

  private readonly valeursLigne = signalFormulaire(this.formLigne);
  /** Montant de la ligne d'estimation en cours de saisie. */
  protected readonly apercuLigne = computed(() => {
    const v = this.valeursLigne();
    const m = this.service.parId().get(v.materiauId ?? '');
    return montantLigne(Number(v.quantite) || 0, m?.prixUnitaire ?? 0);
  });

  protected ouvrirAjout(): void {
    this.editionId.set(null);
    this.form.reset({
      nom: '', categorie: this.parametres.categoriesMateriaux()[0] ?? '', unite: this.parametres.unites()[0] ?? '',
      prixUnitaire: 0, originePrix: 'hypothese', fournisseur: '', dateMajPrix: aujourdhuiISO(), seuilAlerte: 0,
      structurel: false, notes: '',
    });
    this.formulaireVisible.set(true);
  }

  protected ouvrirModification(m: Materiau): void {
    this.editionId.set(m.id);
    this.form.reset({ ...m });
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
    const donnees: Omit<Materiau, 'id'> = {
      nom: v.nom!.trim(),
      categorie: v.categorie!,
      unite: v.unite!,
      prixUnitaire: Number(v.prixUnitaire),
      originePrix: Number(v.prixUnitaire) === 0 ? 'a_renseigner' : v.originePrix === 'a_renseigner' ? 'hypothese' : v.originePrix!,
      fournisseur: (v.fournisseur ?? '').trim(),
      dateMajPrix: v.dateMajPrix || null,
      seuilAlerte: Number(v.seuilAlerte),
      structurel: !!v.structurel,
      notes: v.notes ?? '',
    };
    const id = this.editionId();
    if (id) {
      this.service.modifier(id, donnees);
      this.notifications.succes('Matériau modifié. Les montants ont été recalculés.');
    } else {
      this.service.ajouter(donnees);
      this.notifications.succes('Matériau ajouté au catalogue.');
    }
    this.annuler();
  }

  protected async supprimer(m: Materiau): Promise<void> {
    if (this.service.estUtiliseDansLesAchats(m.id)) {
      this.notifications.erreur(`« ${m.nom} » est utilisé dans des achats ou des sorties de stock : supprimez-les d'abord.`);
      return;
    }
    const n = this.service.nombreLignes(m.id);
    const ok = await this.confirmation.confirmer({
      titre: 'Supprimer le matériau',
      message: `Supprimer « ${m.nom} » du catalogue ?` + (n ? `\n${n} ligne(s) d'estimation seront aussi supprimées.` : ''),
      libelleConfirmer: 'Supprimer',
    });
    if (ok && this.service.supprimer(m.id)) this.notifications.succes('Matériau supprimé.');
  }

  protected modifierPrix(m: Materiau, e: Event): void {
    const prix = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(prix) || prix < 0) {
      this.notifications.erreur('Le prix doit être un nombre positif.');
      return;
    }
    if (this.service.modifierPrix(m.id, Math.round(prix))) this.notifications.succes(`Prix de « ${m.nom} » mis à jour.`);
  }

  // ----- Estimation -----
  protected ajouterLigne(): void {
    if (this.formLigne.invalid) {
      this.formLigne.markAllAsTouched();
      return;
    }
    const v = this.formLigne.getRawValue();
    this.service.ajouterLigne({
      materiauId: v.materiauId!,
      phaseId: v.phaseId || null,
      quantite: Number(v.quantite),
      source: v.source!,
      valide: v.source === 'metre_ingenieur',
      inclureAuBudget: true,
      commentaire: '',
    });
    this.formLigne.reset({ materiauId: '', phaseId: v.phaseId, quantite: null, source: v.source });
    this.notifications.succes("Ligne d'estimation ajoutée.");
  }

  protected modifierLigne(id: string, champ: 'quantite' | 'phaseId' | 'source' | 'valide' | 'inclureAuBudget', e: Event): void {
    const cible = e.target as HTMLInputElement;
    switch (champ) {
      case 'quantite': {
        const q = Number(cible.value);
        if (Number.isFinite(q) && q >= 0) this.service.modifierLigne(id, { quantite: q });
        break;
      }
      case 'phaseId':
        this.service.modifierLigne(id, { phaseId: cible.value || null });
        break;
      case 'source':
        this.service.modifierLigne(id, { source: cible.value as SourceQuantite });
        break;
      default:
        this.service.modifierLigne(id, { [champ]: cible.checked });
    }
  }

  protected async supprimerLigne(id: string, nom: string): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer la ligne d'estimation « ${nom} » ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimerLigne(id);
      this.notifications.succes('Ligne supprimée.');
    }
  }

  protected async validerTout(): Promise<void> {
    const ok = await this.confirmation.confirmer({
      titre: 'Valider toutes les quantités',
      message:
        "Confirmez-vous que TOUTES les quantités ont été remplacées par le métré validé par l'ingénieur ? " +
        'Ne le faites pas si certaines quantités sont encore des hypothèses.',
      libelleConfirmer: 'Oui, tout est validé',
      danger: false,
    });
    if (ok) {
      this.service.validerToutesLesLignes();
      this.notifications.succes('Toutes les lignes sont marquées « métré de l’ingénieur ».');
    }
  }

  protected exporterCsv(): void {
    telechargerCsv(
      `catalogue-materiaux-${aujourdhuiISO()}.csv`,
      ['Matériau', 'Catégorie', 'Unité', 'Prix unitaire (FCFA)', 'Origine du prix', 'Fournisseur', 'Mise à jour du prix',
        'Quantité prévue', 'Montant prévu (FCFA)', 'Quantité achetée', 'Quantité reçue', 'Quantité consommée', 'Stock restant'],
      this.catalogue().map(({ m, stock }) => [
        m.nom, m.categorie, m.unite, m.prixUnitaire, LIBELLES_ORIGINE_PRIX[m.originePrix], m.fournisseur, m.dateMajPrix,
        stock.prevu, stock.montantPrevu, stock.commande, stock.recu, stock.consomme, stock.disponible,
      ]),
    );
  }

  protected readonly valeur = valeurChamp;
}
