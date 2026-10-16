import { ecartBudgetaire, montantLigne, pourcentage, reserveImprevus, resteAPayer, somme } from './montants';
import { formatDate, formatFcfa, formatMois } from './format';
import { versCsv } from './csv';

describe('Formules de base', () => {
  it('Montant = Quantité × Prix unitaire', () => {
    expect(montantLigne(250, 5000)).toBe(1_250_000);
    expect(montantLigne(2.5, 650_000)).toBe(1_625_000);
    expect(montantLigne(0, 5000)).toBe(0);
  });

  it('arrondit au franc près et ignore les valeurs invalides', () => {
    expect(montantLigne(0.333, 1000)).toBe(333);
    expect(montantLigne(Number.NaN, 1000)).toBe(0);
  });

  it('Écart budgétaire = Dépenses réelles − Budget prévisionnel', () => {
    expect(ecartBudgetaire(1_200_000, 1_000_000)).toBe(200_000); // dépassement
    expect(ecartBudgetaire(800_000, 1_000_000)).toBe(-200_000); // économie
  });

  it('Reste à payer = Montant convenu − Montant déjà payé', () => {
    expect(resteAPayer(800_000, 200_000)).toBe(600_000);
    expect(resteAPayer(100_000, 150_000)).toBe(-50_000); // trop versé
  });

  it('Réserve pour imprévus = base × % / 100 (jamais négative)', () => {
    expect(reserveImprevus(6_410_000, 10)).toBe(641_000);
    expect(reserveImprevus(1_000_000, -5)).toBe(0);
  });

  it('somme et pourcentage', () => {
    expect(somme([{ v: 1 }, { v: 2 }, { v: 3 }], (x) => x.v)).toBe(6);
    expect(pourcentage(25, 100)).toBe(25);
    expect(pourcentage(10, 0)).toBe(0);
  });
});

describe('Formats français', () => {
  it('formate les montants en FCFA avec séparateurs de milliers', () => {
    expect(formatFcfa(1_250_000)).toBe('1\u00a0250\u00a0000\u00a0FCFA');
  });
  it('formate les dates au format JJ/MM/AAAA', () => {
    expect(formatDate('2026-10-09')).toBe('09/10/2026');
    expect(formatDate(null)).toBe('—');
  });
  it('formate les mois', () => {
    expect(formatMois('2027-01', true)).toBe('janvier 2027');
  });
  it('produit un CSV compatible Excel français', () => {
    expect(versCsv(['A', 'B'], [[2.5, 'x;y'], [true, null]])).toBe('A;B\r\n2,5;"x;y"\r\nOui;');
  });
});
