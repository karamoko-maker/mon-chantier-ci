import { EnveloppeMainOeuvre, Intervention } from '../models';
import {
  budgetMainOeuvre,
  detecterDoublonsForfait,
  evaluerEnveloppes,
  montantConvenuIntervention,
  resteAPayerIntervention,
} from './main-oeuvre.calc';

function intervention(p: Partial<Intervention>): Intervention {
  return {
    id: 'i', metier: 'Maçons', prestataire: '', phaseId: 'p1', date: '2026-10-01', mode: 'journalier',
    nombrePersonnes: 0, tarifJournalier: 0, nombreJours: 0, heuresSupplementaires: 0, tarifHoraireSup: 0,
    montantForfait: 0, prestationsCouvertes: [], montantPaye: 0, commentaire: '', ...p,
  };
}

function enveloppe(p: Partial<EnveloppeMainOeuvre>): EnveloppeMainOeuvre {
  return { id: 'e', metier: 'Maçons', montantMin: 300_000, montantMax: 600_000, montantRetenu: 450_000, phaseId: null, inclureAuBudget: true, ...p };
}

describe("Main-d'œuvre", () => {
  it('Coût = Nombre de personnes × Tarif journalier × Nombre de jours', () => {
    const i = intervention({ nombrePersonnes: 3, tarifJournalier: 7_000, nombreJours: 10 });
    expect(montantConvenuIntervention(i)).toBe(210_000);
  });

  it('ajoute les heures supplémentaires', () => {
    const i = intervention({ nombrePersonnes: 2, tarifJournalier: 5_000, nombreJours: 4, heuresSupplementaires: 6, tarifHoraireSup: 1_000 });
    expect(montantConvenuIntervention(i)).toBe(46_000);
  });

  it('utilise le montant du forfait', () => {
    expect(montantConvenuIntervention(intervention({ mode: 'forfait', montantForfait: 800_000, nombrePersonnes: 9 }))).toBe(800_000);
  });

  it('Reste à payer = convenu − acomptes', () => {
    const i = intervention({ mode: 'forfait', montantForfait: 800_000, montantPaye: 200_000 });
    expect(resteAPayerIntervention(i)).toBe(600_000);
  });

  it('compte une enveloppe tant qu’aucune intervention ne la remplace', () => {
    const [s] = evaluerEnveloppes([enveloppe({})], []);
    expect(s.comptee).toBe(true);
  });

  it('exclut une enveloppe déjà couverte par un forfait (pas de double comptage)', () => {
    const forfait = intervention({ id: 'f', metier: 'Chef maçon', mode: 'forfait', montantForfait: 800_000, prestationsCouvertes: ['Maçons'] });
    const [s] = evaluerEnveloppes([enveloppe({})], [forfait]);
    expect(s.comptee).toBe(false);
    expect(s.raison).toContain('forfait');
    expect(budgetMainOeuvre([forfait], evaluerEnveloppes([enveloppe({})], [forfait]))).toBe(800_000);
  });

  it('remplace une enveloppe par les interventions réelles du même métier', () => {
    const reelle = intervention({ metier: 'Maçons', nombrePersonnes: 2, tarifJournalier: 6_000, nombreJours: 5 });
    const statuts = evaluerEnveloppes([enveloppe({})], [reelle]);
    expect(statuts[0].comptee).toBe(false);
    expect(budgetMainOeuvre([reelle], statuts)).toBe(60_000);
  });

  it("limite le contrôle à la phase de l'enveloppe", () => {
    const forfaitAutrePhase = intervention({ id: 'f', metier: 'Chef maçon', mode: 'forfait', phaseId: 'p2', prestationsCouvertes: ['Maçons'] });
    const [s] = evaluerEnveloppes([enveloppe({ phaseId: 'p1' })], [forfaitAutrePhase]);
    expect(s.comptee).toBe(true);
  });

  it('détecte une intervention journalière déjà couverte par un forfait', () => {
    const forfait = intervention({ id: 'f', metier: 'Chef maçon', mode: 'forfait', prestationsCouvertes: ['Manœuvres'] });
    const journalier = intervention({ id: 'j', metier: 'Manœuvres', nombrePersonnes: 2, tarifJournalier: 4_000, nombreJours: 3 });
    const doublons = detecterDoublonsForfait([forfait, journalier]);
    expect(doublons.length).toBe(1);
    expect(doublons[0].intervention.id).toBe('j');
  });
});
