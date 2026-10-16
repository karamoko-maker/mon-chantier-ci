import { creerDonneesInitiales } from '../data/donnees-initiales';
import { Depense } from '../models';
import { calculerSynthese } from './budget.calc';
import { genererAlertes } from './controles.calc';
import { comparerDates, comparerLibelles, groupe, grouperPar, indexerParId } from './regroupement';
import { calculerStocks } from './stock.calc';

describe('Outils de regroupement', () => {
  it('regroupe en une passe et indexe par identifiant', () => {
    const g = grouperPar([{ id: 'a', p: 1 }, { id: 'b', p: 2 }, { id: 'c', p: 1 }], (x) => x.p);
    expect(g.get(1)!.map((x) => x.id)).toEqual(['a', 'c']);
    expect(groupe(g, 3)).toEqual([]);
    expect(indexerParId([{ id: 'x' }, { id: 'y' }]).get('y')).toEqual({ id: 'y' });
  });

  it('compare les dates ISO et les libellés français', () => {
    expect(['2026-11-02', '2026-01-15', '2026-10-09'].sort(comparerDates)).toEqual(['2026-01-15', '2026-10-09', '2026-11-02']);
    expect(comparerDates(null, '2026-01-01')).toBeLessThan(0);
    expect(['Étais', 'Ciment', 'Eau'].sort(comparerLibelles)).toEqual(['Ciment', 'Eau', 'Étais']);
  });
});

describe('Optimisations sans changement de résultat', () => {
  function depense(i: number, p: Partial<Depense> = {}): Depense {
    return {
      id: 'd' + i, date: '2026-10-05', categorie: 'transport', phaseId: null, description: 'Dépense ' + i,
      montantPrevu: 10_000, montantPaye: 0, etape: 'prevue', moyenPaiement: '', beneficiaire: '', reference: '', commentaire: '', ...p,
    };
  }

  it("compte comme « non affecté » un élément dont la phase a été supprimée", () => {
    const d = creerDonneesInitiales('2026-10-09');
    d.depenses = [depense(1, { phaseId: 'phase-inexistante', etape: 'facturee', montantPaye: 10_000 })];
    const s = calculerSynthese(d);
    expect(s.nonAffecte.postes.transport).toBe(10_000);
    expect(s.nonAffecte.paye).toBe(10_000);
    expect(s.postes.transport).toBe(10_000);
  });

  it('regroupe les alertes répétitives en une seule alerte récapitulative', () => {
    const d = creerDonneesInitiales('2026-10-09');
    d.depenses = [1, 2, 3, 4, 5].map((i) => depense(i));
    const s = calculerSynthese(d);
    const st = calculerStocks(d.materiaux, d.estimation, d.achats, d.consommations);
    const sansPhase = genererAlertes(d, s, st, '2026-10-09').filter((a) => a.message.includes('aucune phase'));
    expect(sansPhase.length).toBe(1);
    expect(sansPhase[0].message).toContain('5 dépenses');

    d.depenses = [depense(1), depense(2)];
    const deux = genererAlertes(d, calculerSynthese(d), st, '2026-10-09').filter((a) => a.message.includes('aucune phase'));
    expect(deux.length).toBe(2);
  });
});
