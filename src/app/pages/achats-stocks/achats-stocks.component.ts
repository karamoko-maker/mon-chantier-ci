import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { telechargerCsv } from '../../core/calculs/csv';
import { aujourdhuiISO } from '../../core/calculs/dates';
import { montantLigne, nombre, resteAPayer, somme } from '../../core/calculs/montants';
import { StatutLivraison } from '../../core/calculs/stock.calc';
import { Achat, Consommation } from '../../core/models';
import { AchatsStocksService } from '../../core/services/achats-stocks.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { ControlesService } from '../../core/services/controles.service';
import { MateriauxService } from '../../core/services/materiaux.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParametresService } from '../../core/services/parametres.service';
import { PhasesService } from '../../core/services/phases.service';
import { BandeauComponent } from '../../shared/components/bandeau.component';
import { CarteStatComponent } from '../../shared/components/carte-stat.component';
import { ErreurChampComponent } from '../../shared/components/erreur-champ.component';
import { formatFcfa } from '../../core/calculs/format';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';
import { signalFormulaire, valeurChamp } from '../../shared/formulaires';

type Onglet = 'achats' | 'sorties' | 'stocks';

export const LIBELLES_LIVRAISON: Record<StatutLivraison, string> = {
  commande: 'Commandé, non livré',
  partiel: 'Livraison partielle',
  livre: 'Livré',
  excedent: 'Livré au-delà de la commande',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-achats-stocks',
  imports: [ReactiveFormsModule, BandeauComponent, CarteStatComponent, ErreurChampComponent, ...PIPES_FORMAT],
  templateUrl: './achats-stocks.component.html',
})
export class AchatsStocksComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(AchatsStocksService);
  protected readonly materiaux = inject(MateriauxService);
  protected readonly phases = inject(PhasesService);
  protected readonly parametres = inject(ParametresService);
  private readonly controles = inject(ControlesService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly livraisons = LIBELLES_LIVRAISON;
  protected readonly fcfa = formatFcfa;
  protected readonly onglet = signal<Onglet>('achats');
  protected readonly recherche = signal('');
  protected readonly alertesSeules = signal(false);
  protected readonly editionId = signal<string | null>(null);
  protected readonly editionSortieId = signal<string | null>(null);
  protected readonly formulaireVisible = signal(false);
  protected readonly formulaireSortieVisible = signal(false);
  protected readonly alertes = computed(() => this.controles.alertesDuModule('Stocks', 'Achats'));

  protected readonly achats = computed(() => {
    const r = this.recherche().trim().toLowerCase();
    const noms = this.materiaux.parId();
    return this.service
      .achats()
      .map((x) => ({ ...x, nom: noms.get(x.achat.materiauId)?.nom ?? 'Matériau supprimé', unite: noms.get(x.achat.materiauId)?.unite ?? '' }))
      .filter((x) => !r || x.nom.toLowerCase().includes(r) || x.achat.fournisseur.toLowerCase().includes(r) || x.achat.reference.toLowerCase().includes(r));
  });

  protected readonly totaux = computed(() => {
    const l = this.achats();
    const montant = somme(l, (x) => x.montant);
    const paye = somme(l, (x) => x.achat.montantPaye);
    return { montant, paye, solde: resteAPayer(montant, paye) };
  });

  protected readonly stocks = computed(() =>
    this.service.stocks().filter((s) => !this.alertesSeules() || s.faible || s.negatif || s.enAttenteLivraison > 0),
  );

  protected readonly sorties = computed(() => {
    const noms = this.materiaux.parId();
    return this.service.consommations().map((c) => ({ c, nom: noms.get(c.materiauId)?.nom ?? '—', unite: noms.get(c.materiauId)?.unite ?? '' }));
  });

  protected readonly form = this.fb.group({
    date: [aujourdhuiISO(), Validators.required],
    materiauId: ['', Validators.required],
    phaseId: [''],
    quantiteCommandee: [null as number | null, [Validators.required, Validators.min(0)]],
    quantiteLivree: [0, [Validators.required, Validators.min(0)]],
    prixUnitaire: [0, [Validators.required, Validators.min(0)]],
    fournisseur: [''],
    modePaiement: [''],
    montantPaye: [0, [Validators.required, Validators.min(0)]],
    reference: [''],
    commentaire: [''],
    majPrixCatalogue: [false],
  });

  protected readonly formSortie = this.fb.group({
    date: [aujourdhuiISO(), Validators.required],
    materiauId: ['', Validators.required],
    phaseId: [''],
    quantite: [null as number | null, [Validators.required, Validators.min(0)]],
    commentaire: [''],
  });

  private readonly valeurs = signalFormulaire(this.form);
  private readonly valeursSortie = signalFormulaire(this.formSortie);

  /** Montant et solde de l'achat en cours de saisie. */
  protected readonly apercu = computed(() => {
    const v = this.valeurs();
    const montant = montantLigne(nombre(v.quantiteCommandee), nombre(v.prixUnitaire));
    return { montant, solde: resteAPayer(montant, nombre(v.montantPaye)) };
  });

  /** Stock disponible du matériau choisi pour la sortie (recalculé quand le matériau ou le stock change). */
  protected readonly disponibleSortie = computed(() => {
    const id = this.valeursSortie().materiauId;
    return id ? this.service.disponible(id, this.editionSortieId() ?? undefined) : 0;
  });

  protected choisirMateriau(): void {
    if (this.editionId()) return;
    const m = this.materiaux.parId().get(this.form.controls.materiauId.value ?? '');
    if (m) this.form.patchValue({ prixUnitaire: m.prixUnitaire, fournisseur: m.fournisseur || this.form.controls.fournisseur.value });
  }

  protected ouvrirAjout(): void {
    this.editionId.set(null);
    this.form.reset({
      date: aujourdhuiISO(), materiauId: '', phaseId: '', quantiteCommandee: null, quantiteLivree: 0, prixUnitaire: 0,
      fournisseur: '', modePaiement: this.parametres.modesPaiement()[0] ?? '', montantPaye: 0, reference: '', commentaire: '', majPrixCatalogue: false,
    });
    this.formulaireVisible.set(true);
  }

  protected ouvrirModification(a: Achat): void {
    this.editionId.set(a.id);
    this.form.reset({ ...a, phaseId: a.phaseId ?? '', majPrixCatalogue: false });
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
    const donnees: Omit<Achat, 'id'> = {
      date: v.date!,
      materiauId: v.materiauId!,
      phaseId: v.phaseId || null,
      quantiteCommandee: Number(v.quantiteCommandee),
      quantiteLivree: Number(v.quantiteLivree),
      prixUnitaire: Math.round(Number(v.prixUnitaire)),
      fournisseur: (v.fournisseur ?? '').trim(),
      modePaiement: v.modePaiement ?? '',
      montantPaye: Math.round(Number(v.montantPaye)),
      reference: (v.reference ?? '').trim(),
      commentaire: v.commentaire ?? '',
    };
    if (donnees.quantiteLivree > donnees.quantiteCommandee) {
      this.notifications.info('Attention : la quantité livrée dépasse la quantité commandée.');
    }
    const id = this.editionId();
    if (id) {
      this.service.modifierAchat(id, donnees);
      this.notifications.succes('Achat modifié. Le stock a été recalculé.');
    } else {
      this.service.ajouterAchat(donnees);
      this.notifications.succes('Achat enregistré. Le stock a été recalculé.');
    }
    if (v.majPrixCatalogue && donnees.prixUnitaire > 0) {
      this.materiaux.modifier(donnees.materiauId, {
        prixUnitaire: donnees.prixUnitaire, originePrix: 'facture', dateMajPrix: donnees.date,
        ...(donnees.fournisseur ? { fournisseur: donnees.fournisseur } : {}),
      });
    }
    this.annuler();
  }

  protected async supprimer(a: Achat, nom: string): Promise<void> {
    const ok = await this.confirmation.confirmer({
      message: `Supprimer l'achat de « ${nom} » du ${a.date.split('-').reverse().join('/')} ?\nLe stock sera recalculé.`,
      libelleConfirmer: 'Supprimer',
    });
    if (ok) {
      this.service.supprimerAchat(a.id);
      this.notifications.succes('Achat supprimé.');
    }
  }

  /** Marque la commande comme entièrement livrée. */
  protected toutLivre(a: Achat): void {
    this.service.modifierAchat(a.id, { quantiteLivree: a.quantiteCommandee });
    this.notifications.succes('Livraison complète enregistrée.');
  }

  // ----- Sorties -----
  protected ouvrirSortie(c?: Consommation): void {
    this.editionSortieId.set(c?.id ?? null);
    this.formSortie.reset(c ? { ...c, phaseId: c.phaseId ?? '' } : { date: aujourdhuiISO(), materiauId: '', phaseId: '', quantite: null, commentaire: '' });
    this.formulaireSortieVisible.set(true);
  }

  protected enregistrerSortie(): void {
    if (this.formSortie.invalid) {
      this.formSortie.markAllAsTouched();
      return;
    }
    const v = this.formSortie.getRawValue();
    const dispo = this.disponibleSortie();
    if (Number(v.quantite) > dispo) {
      this.formSortie.controls.quantite.setErrors({ stockInsuffisant: { disponible: dispo } });
      this.formSortie.controls.quantite.markAsTouched();
      return;
    }
    const donnees: Omit<Consommation, 'id'> = {
      date: v.date!, materiauId: v.materiauId!, phaseId: v.phaseId || null, quantite: Number(v.quantite), commentaire: v.commentaire ?? '',
    };
    const id = this.editionSortieId();
    if (id) this.service.modifierConsommation(id, donnees);
    else this.service.ajouterConsommation(donnees);
    this.notifications.succes('Sortie de stock enregistrée.');
    this.formulaireSortieVisible.set(false);
    this.editionSortieId.set(null);
  }

  protected async supprimerSortie(c: Consommation, nom: string): Promise<void> {
    const ok = await this.confirmation.confirmer({ message: `Supprimer la sortie de stock « ${nom} » ?`, libelleConfirmer: 'Supprimer' });
    if (ok) {
      this.service.supprimerConsommation(c.id);
      this.notifications.succes('Sortie supprimée.');
    }
  }

  protected exporterCsv(): void {
    if (this.onglet() === 'stocks') {
      telechargerCsv(
        `etat-des-stocks-${aujourdhuiISO()}.csv`,
        ['Matériau', 'Unité', 'Prévu', 'Commandé', 'Reçu', 'Consommé', 'Disponible', 'En attente de livraison', 'Reste à commander', 'Alerte'],
        this.stocks().map((s) => [s.materiau.nom, s.materiau.unite, s.prevu, s.commande, s.recu, s.consomme, s.disponible,
          s.enAttenteLivraison, s.resteACommander, s.negatif ? 'Stock négatif' : s.faible ? 'Stock faible' : '']),
      );
      return;
    }
    telechargerCsv(
      `achats-${aujourdhuiISO()}.csv`,
      ['Date', 'Matériau', 'Phase', 'Qté commandée', 'Qté livrée', 'Unité', 'Prix unitaire', 'Montant total', 'Payé', 'Solde dû', 'Fournisseur', 'Mode de paiement', 'Référence'],
      this.achats().map((x) => [x.achat.date, x.nom, this.phases.nom(x.achat.phaseId), x.achat.quantiteCommandee, x.achat.quantiteLivree,
        x.unite, x.achat.prixUnitaire, x.montant, x.achat.montantPaye, x.solde, x.achat.fournisseur, x.achat.modePaiement, x.achat.reference]),
    );
  }

  protected readonly valeur = valeurChamp;
}
