import { Injectable, computed, inject } from '@angular/core';
import { calculerEtatStock, calculerStocks, montantAchat, soldeAchat, statutLivraison } from '../calculs/stock.calc';
import { comparerDates, comparerLibelles } from '../calculs/regroupement';
import { Achat, Consommation, Id } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';
import { MateriauxService } from './materiaux.service';

/** Achats de matériaux, sorties de stock et état des stocks. */
@Injectable({ providedIn: 'root' })
export class AchatsStocksService {
  private readonly store = inject(ChantierStore);
  private readonly materiaux = inject(MateriauxService);

  readonly achats = computed(() =>
    [...this.store.achats()]
      .sort((a, b) => comparerDates(b.date, a.date))
      .map((a) => ({ achat: a, montant: montantAchat(a), solde: soldeAchat(a), livraison: statutLivraison(a) })),
  );

  readonly consommations = computed(() =>
    [...this.store.consommations()].sort((a, b) => comparerDates(b.date, a.date)),
  );

  /** États de stock non triés (pour les contrôles) : chaque liste n'est parcourue qu'une fois. */
  readonly etats = computed(() =>
    calculerStocks(this.store.materiaux(), this.store.estimation(), this.store.achats(), this.store.consommations()),
  );

  /** États de stock triés par nom (pour l'affichage). */
  readonly stocks = computed(() => [...this.etats()].sort((a, b) => comparerLibelles(a.materiau.nom, b.materiau.nom)));

  /** Stock disponible d'un matériau, en ignorant éventuellement une sortie (cas d'une modification). */
  disponible(materiauId: Id, sansConsommation?: Id): number {
    const m = this.materiaux.parId().get(materiauId);
    if (!m) return 0;
    const consommations = sansConsommation
      ? this.store.consommations().filter((c) => c.id !== sansConsommation)
      : this.store.consommations();
    return calculerEtatStock(m, [], this.store.achats(), consommations).disponible;
  }

  ajouterAchat(a: Omit<Achat, 'id'>): Id {
    return this.store.ajouter('achats', a);
  }
  modifierAchat(id: Id, modifications: Partial<Achat>): void {
    this.store.modifier('achats', id, modifications);
  }
  supprimerAchat(id: Id): void {
    this.store.supprimer('achats', id);
  }

  ajouterConsommation(c: Omit<Consommation, 'id'>): Id {
    return this.store.ajouter('consommations', c);
  }
  modifierConsommation(id: Id, modifications: Partial<Consommation>): void {
    this.store.modifier('consommations', id, modifications);
  }
  supprimerConsommation(id: Id): void {
    this.store.supprimer('consommations', id);
  }
}
