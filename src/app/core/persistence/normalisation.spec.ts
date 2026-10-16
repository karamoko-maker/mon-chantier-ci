import { creerDonneesInitiales } from '../data/donnees-initiales';
import { normaliserDonnees } from './normalisation';

describe('Import / normalisation des sauvegardes', () => {
  it('accepte une sauvegarde exportée', () => {
    const d = creerDonneesInitiales('2026-10-09');
    const relu = normaliserDonnees(JSON.parse(JSON.stringify(d)));
    expect(relu.phases.length).toBe(22);
    expect(relu.estimation.length).toBe(9);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => normaliserDonnees({ bonjour: 1 })).toThrowError(/sauvegarde valide/);
    expect(() => normaliserDonnees(null)).toThrow();
  });

  it('refuse une collection mal formée', () => {
    const d = creerDonneesInitiales() as unknown as Record<string, unknown>;
    expect(() => normaliserDonnees({ ...d, achats: 'abc' })).toThrowError(/achats/);
  });

  it('complète les champs manquants d’une ancienne sauvegarde', () => {
    const d = creerDonneesInitiales();
    const ancienne = { projet: { nom: 'Ancien' }, phases: d.phases, interventions: [{ id: 'x', metier: 'Maçons', mode: 'journalier' }] };
    const relu = normaliserDonnees(ancienne);
    expect(relu.projet.nom).toBe('Ancien');
    expect(relu.projet.pourcentageReserve).toBe(10);
    expect(relu.interventions[0].prestationsCouvertes).toEqual([]);
    expect(relu.achats).toEqual([]);
  });
});
