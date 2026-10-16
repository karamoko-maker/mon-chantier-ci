import { Injectable, computed, inject, signal } from '@angular/core';
import { creerDonneesInitiales } from '../data/donnees-initiales';
import { nouvelId } from '../calculs/identifiant';
import type { DonneesBudget } from '../calculs/budget.calc';
import { ChantierData, CleCollection, ElementDe } from '../models';
import { normaliserDonnees } from './normalisation';
import { StockageAdapter } from './stockage.adapter';

/**
 * Source unique de vérité des données du chantier (service de persistance).
 * Toutes les modifications passent par ce service, qui enregistre automatiquement
 * via l'adaptateur de stockage configuré (localStorage aujourd'hui, API demain).
 */
@Injectable({ providedIn: 'root' })
export class ChantierStore {
  private readonly adapter = inject(StockageAdapter);
  private readonly _data = signal<ChantierData>(creerDonneesInitiales());
  private minuterie: ReturnType<typeof setTimeout> | null = null;

  readonly data = this._data.asReadonly();
  readonly derniereSauvegarde = signal<Date | null>(null);
  readonly erreurSauvegarde = signal<string | null>(null);
  readonly libelleStockage = this.adapter.libelle;
  readonly synchronise = this.adapter.synchronise;

  /*
   * Tranches de données. Une modification ne remplace que la collection concernée :
   * un calcul qui lit `phases()` n'est donc relancé que si les phases changent,
   * et non à chaque saisie dans l'épargne ou les paramètres.
   */
  readonly projet = computed(() => this._data().projet);
  readonly phases = computed(() => this._data().phases);
  readonly materiaux = computed(() => this._data().materiaux);
  readonly estimation = computed(() => this._data().estimation);
  readonly achats = computed(() => this._data().achats);
  readonly consommations = computed(() => this._data().consommations);
  readonly equipements = computed(() => this._data().equipements);
  readonly interventions = computed(() => this._data().interventions);
  readonly enveloppes = computed(() => this._data().enveloppes);
  readonly depenses = computed(() => this._data().depenses);
  readonly financement = computed(() => this._data().financement);
  readonly revenus = computed(() => this._data().revenus);
  readonly objectifs = computed(() => this._data().objectifs);
  readonly parametres = computed(() => this._data().parametres);

  /** Données de la synthèse budgétaire : recalculées seulement si l'une de ces tranches change. */
  readonly donneesBudget = computed<DonneesBudget>(() => ({
    projet: this.projet(),
    phases: this.phases(),
    materiaux: this.materiaux(),
    estimation: this.estimation(),
    achats: this.achats(),
    equipements: this.equipements(),
    interventions: this.interventions(),
    enveloppes: this.enveloppes(),
    depenses: this.depenses(),
  }));

  /** Chargement initial (appelé au démarrage de l'application). */
  async initialiser(): Promise<void> {
    const brut = await this.adapter.charger();
    if (brut) {
      try {
        this._data.set(normaliserDonnees(brut));
        this.derniereSauvegarde.set(new Date());
      } catch (e) {
        this.erreurSauvegarde.set(
          `Les données enregistrées n'ont pas pu être relues (${(e as Error).message}). Les données initiales sont affichées.`,
        );
      }
    } else {
      await this.enregistrerMaintenant();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.minuterie) void this.enregistrerMaintenant();
      });
    }
  }

  /** Applique une modification immuable puis planifie la sauvegarde. */
  mettreAJour(modification: (d: ChantierData) => ChantierData): void {
    const avant = this._data();
    const apres = modification(avant);
    if (apres === avant) return; // rien n'a changé : ni recalcul ni sauvegarde
    this._data.set(apres);
    this.planifierSauvegarde();
  }

  ajouter<K extends CleCollection>(cle: K, element: Omit<ElementDe<K>, 'id'> & { id?: string }): string {
    const id = element.id || nouvelId();
    this.mettreAJour((d) => ({ ...d, [cle]: [...(d[cle] as ElementDe<K>[]), { ...element, id }] }));
    return id;
  }

  modifier<K extends CleCollection>(cle: K, id: string, modifications: Partial<ElementDe<K>>): void {
    this.mettreAJour((d) => {
      const liste = d[cle] as ElementDe<K>[];
      const i = liste.findIndex((e) => e.id === id);
      if (i < 0) return d;
      const actuel = liste[i] as unknown as Record<string, unknown>;
      // Aucune valeur réellement modifiée : on garde les mêmes objets (aucun recalcul déclenché).
      if (Object.entries(modifications).every(([k, v]) => Object.is(actuel[k], v))) return d;
      const copie = liste.slice();
      copie[i] = { ...liste[i], ...modifications, id };
      return { ...d, [cle]: copie };
    });
  }

  supprimer<K extends CleCollection>(cle: K, id: string): void {
    this.mettreAJour((d) => {
      const liste = d[cle] as ElementDe<K>[];
      return liste.some((e) => e.id === id) ? { ...d, [cle]: liste.filter((e) => e.id !== id) } : d;
    });
  }

  /** Remplace toutes les données (import d'une sauvegarde JSON). */
  remplacer(brut: unknown): void {
    const donnees = normaliserDonnees(brut);
    this._data.set(donnees);
    void this.enregistrerMaintenant();
  }

  /** Revient aux données initiales (hypothèses de départ). */
  reinitialiser(): void {
    this._data.set(creerDonneesInitiales());
    void this.enregistrerMaintenant();
  }

  exporterJson(): string {
    return JSON.stringify(this._data(), null, 2);
  }

  private planifierSauvegarde(): void {
    if (this.minuterie) clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => void this.enregistrerMaintenant(), 300);
  }

  async enregistrerMaintenant(): Promise<void> {
    if (this.minuterie) {
      clearTimeout(this.minuterie);
      this.minuterie = null;
    }
    try {
      await this.adapter.enregistrer(this._data());
      this.derniereSauvegarde.set(new Date());
      this.erreurSauvegarde.set(null);
    } catch (e) {
      this.erreurSauvegarde.set((e as Error).message);
    }
  }
}
