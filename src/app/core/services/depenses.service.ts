import { Injectable, computed, inject } from '@angular/core';
import { ecartBudgetaire, somme } from '../calculs/montants';
import { montantEngageDepense } from '../calculs/mouvements.calc';
import { comparerDates } from '../calculs/regroupement';
import { CategorieDepense, Depense, Id } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';
import { BudgetService } from './budget.service';

export type EtatPaiement = 'non_paye' | 'partiel' | 'paye' | 'depasse';

export function etatPaiement(d: Depense): EtatPaiement {
  if (d.montantPaye <= 0) return 'non_paye';
  if (d.montantPaye < d.montantPrevu) return 'partiel';
  if (d.montantPaye > d.montantPrevu) return 'depasse';
  return 'paye';
}

/** Registre des dépenses, transports, frais annexes et vue consolidée des paiements. */
@Injectable({ providedIn: 'root' })
export class DepensesService {
  private readonly store = inject(ChantierStore);
  private readonly budget = inject(BudgetService);

  readonly depenses = computed(() =>
    [...this.store.depenses()]
      .sort((a, b) => comparerDates(b.date, a.date))
      .map((d) => ({
        depense: d,
        engage: montantEngageDepense(d),
        ecart: ecartBudgetaire(d.montantPaye, d.montantPrevu),
        paiement: etatPaiement(d),
      })),
  );

  /** Tous les engagements et paiements du chantier (achats, main-d'œuvre, équipements, dépenses). */
  readonly mouvements = computed(() => this.budget.synthese().mouvements);

  /** Récapitulatif par catégorie : prévu, payé, écart. */
  readonly recapParCategorie = computed(() => {
    const parCat = new Map<CategorieDepense, { prevu: number; paye: number }>();
    for (const d of this.store.depenses()) {
      const l = parCat.get(d.categorie) ?? { prevu: 0, paye: 0 };
      l.prevu += d.montantPrevu;
      l.paye += d.montantPaye;
      parCat.set(d.categorie, l);
    }
    return [...parCat.entries()].map(([categorie, v]) => ({
      categorie,
      ...v,
      ecart: ecartBudgetaire(v.paye, v.prevu),
    }));
  });

  readonly totaux = computed(() => {
    const d = this.store.depenses();
    const prevu = somme(d, (x) => x.montantPrevu);
    const paye = somme(d, (x) => x.montantPaye);
    return { prevu, paye, ecart: ecartBudgetaire(paye, prevu) };
  });

  ajouter(d: Omit<Depense, 'id'>): Id {
    return this.store.ajouter('depenses', d);
  }
  modifier(id: Id, modifications: Partial<Depense>): void {
    this.store.modifier('depenses', id, modifications);
  }
  supprimer(id: Id): void {
    this.store.supprimer('depenses', id);
  }
}
