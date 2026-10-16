import { TestBed } from '@angular/core/testing';
import { ChantierData } from '../models';
import { ChantierStore } from './chantier-store.service';
import { StockageAdapter } from './stockage.adapter';

class StockageMemoire extends StockageAdapter {
  readonly libelle = 'Mémoire';
  readonly synchronise = false;
  enregistrements = 0;
  async charger(): Promise<unknown | null> {
    return null;
  }
  async enregistrer(_d: ChantierData): Promise<void> {
    this.enregistrements++;
  }
  async effacer(): Promise<void> {}
}

describe('ChantierStore', () => {
  let store: ChantierStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: StockageAdapter, useClass: StockageMemoire }] });
    store = TestBed.inject(ChantierStore);
  });

  it("ne remplace que la collection modifiée (les autres tranches gardent la même référence)", () => {
    const phases = store.phases();
    const materiaux = store.materiaux();
    store.modifier('materiaux', 'mat-ciment', { prixUnitaire: 5_500 });
    expect(store.materiaux()).not.toBe(materiaux);
    expect(store.phases()).toBe(phases);
  });

  it('ignore une modification qui ne change aucune valeur', () => {
    const avant = store.data();
    store.modifier('materiaux', 'mat-ciment', { prixUnitaire: 5_000 });
    store.modifier('materiaux', 'identifiant-inconnu', { prixUnitaire: 1 });
    store.supprimer('achats', 'identifiant-inconnu');
    expect(store.data()).toBe(avant);
  });

  it("ne recalcule pas les données budgétaires quand seul le plan d'épargne change", () => {
    const budget = store.donneesBudget();
    store.mettreAJour((d) => ({ ...d, financement: { ...d.financement, capaciteMensuelle: 400_000 } }));
    expect(store.donneesBudget()).toBe(budget);
    store.modifier('phases', 'phase-01', { avancement: 50 });
    expect(store.donneesBudget()).not.toBe(budget);
  });
});
