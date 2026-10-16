import { creerDonneesInitiales } from '../data/donnees-initiales';
import { ChantierData, Depense } from '../models';
import { calculerSynthese } from './budget.calc';
import { montantEngageDepense } from './mouvements.calc';
import { coutEquipement } from './equipement.calc';
import { genererAlertes } from './controles.calc';
import { calculerStocks } from './stock.calc';

function donnees(): ChantierData {
  return creerDonneesInitiales('2026-10-09');
}

function depense(p: Partial<Depense>): Depense {
  return {
    id: 'd', date: '2026-10-05', categorie: 'transport', phaseId: 'phase-04', description: 'Livraison ciment',
    montantPrevu: 50_000, montantPaye: 0, etape: 'prevue', moyenPaiement: '', beneficiaire: '', reference: '', commentaire: '', ...p,
  };
}

describe('Données initiales', () => {
  it('reprennent l’estimation de départ : sous-total de 4 860 000 FCFA', () => {
    const s = calculerSynthese(donnees());
    expect(s.postes.materiaux).toBe(4_860_000);
  });

  it('contiennent les 22 phases et des enveloppes de main-d’œuvre de 1 550 000 FCFA (valeurs médianes)', () => {
    const d = donnees();
    expect(d.phases.length).toBe(22);
    expect(calculerSynthese(d).postes.mainOeuvre).toBe(1_550_000);
  });

  it('n’attribuent aucun coût aux équipements tant que les prix ne sont pas renseignés', () => {
    expect(donnees().equipements.every((e) => coutEquipement(e) === 0)).toBe(true);
  });
});

describe('Synthèse budgétaire', () => {
  it('affiche la réserve pour imprévus séparément du budget de base', () => {
    const s = calculerSynthese(donnees());
    expect(s.baseEstimatif).toBe(6_410_000);
    expect(s.reserveEstimatif).toBe(641_000);
    expect(s.totalEstimatif).toBe(7_051_000);
  });

  it('se met à jour quand un prix unitaire change', () => {
    const d = donnees();
    d.materiaux = d.materiaux.map((m) => (m.id === 'mat-ciment' ? { ...m, prixUnitaire: 5_500 } : m));
    expect(calculerSynthese(d).postes.materiaux).toBe(4_860_000 + 250 * 500);
  });

  it('impute les lignes au budget de leur phase', () => {
    const d = donnees();
    d.estimation = d.estimation.map((l) => (l.id === 'est-ciment' ? { ...l, phaseId: 'phase-04' } : l));
    const s = calculerSynthese(d);
    expect(s.phases.find((p) => p.phase.id === 'phase-04')!.postes.materiaux).toBe(1_250_000);
    expect(s.nonAffecte.postes.materiaux).toBe(3_610_000);
    expect(s.postes.materiaux).toBe(4_860_000);
  });

  it('utilise le budget validé comme référence quand il existe', () => {
    const d = donnees();
    d.estimation = d.estimation.map((l) => (l.id === 'est-ciment' ? { ...l, phaseId: 'phase-04' } : l));
    d.phases = d.phases.map((p) => (p.id === 'phase-04' ? { ...p, budgetValide: 2_000_000 } : p));
    const s = calculerSynthese(d);
    const p4 = s.phases.find((p) => p.phase.id === 'phase-04')!;
    expect(p4.estimatif).toBe(1_250_000);
    expect(p4.reference).toBe(2_000_000);
    expect(s.totalValide).toBe(2_000_000);
    expect(s.nombrePhasesValidees).toBe(1);
    expect(s.baseReference).toBe(6_410_000 - 1_250_000 + 2_000_000);
  });

  it('distingue engagé et payé, et ne confond pas commande et paiement', () => {
    expect(montantEngageDepense(depense({ etape: 'prevue' }))).toBe(0);
    expect(montantEngageDepense(depense({ etape: 'commandee' }))).toBe(50_000);
    expect(montantEngageDepense(depense({ etape: 'facturee', montantPaye: 60_000 }))).toBe(60_000);

    const d = donnees();
    d.depenses = [depense({ etape: 'commandee', montantPaye: 20_000 })];
    const s = calculerSynthese(d);
    expect(s.engage.transport).toBe(50_000);
    expect(s.paye.transport).toBe(20_000);
    expect(s.postes.transport).toBe(50_000);
  });

  it('détecte un dépassement constaté sur une phase', () => {
    const d = donnees();
    d.depenses = [depense({ etape: 'facturee', montantPaye: 80_000 })];
    const p4 = calculerSynthese(d).phases.find((p) => p.phase.id === 'phase-04')!;
    expect(p4.reference).toBe(50_000);
    expect(p4.ecart).toBe(30_000);
    expect(p4.depassement).toBe('constate');
  });

  it("les dépenses imprévues consomment la réserve sans gonfler le budget de base", () => {
    const d = donnees();
    d.depenses = [depense({ categorie: 'imprevus', montantPrevu: 100_000, montantPaye: 100_000, etape: 'facturee' })];
    const s = calculerSynthese(d);
    expect(s.baseEstimatif).toBe(6_410_000);
    expect(s.reserveRestante).toBe(641_000 - 100_000);
  });

  it('calcule l’avancement global pondéré par le budget', () => {
    const d = donnees();
    d.phases = d.phases.map((p) => (p.id === 'phase-01' ? { ...p, autresCouts: 300_000, avancement: 100 } : p.id === 'phase-02' ? { ...p, autresCouts: 100_000, avancement: 0 } : p));
    expect(calculerSynthese(d).avancementGlobal).toBe(75);
  });

  it('signale le double comptage lot « Matériel de chantier » / inventaire chiffré', () => {
    const d = donnees();
    d.equipements = d.equipements.map((e, i) => (i === 0 ? { ...e, prixAchatUnitaire: 25_000, quantite: 2 } : e));
    const s = calculerSynthese(d);
    const alertes = genererAlertes(d, s, calculerStocks(d.materiaux, d.estimation, d.achats, d.consommations), '2026-10-09');
    expect(alertes.some((a) => a.message.includes('Matériel de chantier'))).toBe(true);
  });
});
