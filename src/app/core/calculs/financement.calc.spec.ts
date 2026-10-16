import { Financement, RevenuExceptionnel } from '../models';
import { ajouterMois, ecartMois } from './dates';
import { calculerCalendrier, fondsAuMois, montantDisponible, moisPourAtteindre, resteAFinancer } from './financement.calc';

const f: Financement = {
  epargneActuelle: 2_000_000,
  capaciteMensuelle: 500_000,
  reservePersonnelle: 300_000,
  moisDebut: '2026-10',
  horizonMois: 36,
  inclureReserveDansBesoins: true,
};
const prime: RevenuExceptionnel = { id: 'r', libelle: 'Prime', montant: 1_000_000, datePrevue: '2027-01-15', recu: false };

describe('Financement', () => {
  it('Disponible = épargne actuelle − dépenses personnelles à préserver', () => {
    expect(montantDisponible(f)).toBe(1_700_000);
    expect(montantDisponible({ ...f, reservePersonnelle: 3_000_000 })).toBe(0);
  });

  it('Reste à financer = budget − payé − disponible (jamais négatif)', () => {
    expect(resteAFinancer(6_886_000, 560_000, 1_700_000)).toBe(4_626_000);
    expect(resteAFinancer(1_000_000, 0, 2_000_000)).toBe(0);
  });

  it("ne considère jamais un revenu futur comme déjà disponible", () => {
    expect(fondsAuMois(f, [prime], 0)).toBe(1_700_000);
    expect(fondsAuMois(f, [prime], 2)).toBe(2_700_000); // décembre : prime pas encore là
    expect(fondsAuMois(f, [prime], 3)).toBe(4_200_000); // janvier : prime comptée
  });

  it('ignore un revenu du mois en cours tant qu’il n’est pas reçu', () => {
    const ceMois = { ...prime, datePrevue: '2026-10-20' };
    expect(fondsAuMois(f, [ceMois], 0)).toBe(1_700_000);
    expect(fondsAuMois(f, [ceMois], 1)).toBe(3_200_000);
  });

  it('ignore les revenus déjà reçus ou dont la date est passée', () => {
    expect(fondsAuMois(f, [{ ...prime, recu: true }], 6)).toBe(1_700_000 + 3_000_000);
    expect(fondsAuMois(f, [{ ...prime, datePrevue: '2026-08-01' }], 6)).toBe(1_700_000 + 3_000_000);
  });

  it('nombre de mois avant d’atteindre un objectif', () => {
    expect(moisPourAtteindre(1_500_000, f, [])).toBe(0);
    expect(moisPourAtteindre(3_000_000, f, [])).toBe(3);
    expect(moisPourAtteindre(3_000_000, f, [prime])).toBe(3);
    expect(moisPourAtteindre(10_000_000, { ...f, capaciteMensuelle: 0 }, [])).toBeNull();
  });

  it('calendrier : les phases deviennent lançables dans l’ordre selon les fonds cumulés', () => {
    const cal = calculerCalendrier(f, [], [
      { id: 'a', libelle: 'Phase A', montant: 1_500_000 },
      { id: 'b', libelle: 'Phase B', montant: 1_000_000 },
      { id: 'c', libelle: 'Phase C', montant: 100_000 },
    ]);
    expect(cal.moisParBesoin.get('a')).toBe(0);
    expect(cal.moisParBesoin.get('b')).toBe(2); // 1,7 M + 2 × 0,5 M = 2,7 M ≥ 2,5 M
    expect(cal.moisParBesoin.get('c')).toBe(2);
    expect(cal.lignes[2].nouveauxBesoins.map((b) => b.id)).toEqual(['b', 'c']);
    expect(cal.besoinTotal).toBe(2_600_000);
  });

  it('renvoie null pour un besoin non finançable dans l’horizon', () => {
    const cal = calculerCalendrier({ ...f, horizonMois: 3 }, [], [{ id: 'x', libelle: 'X', montant: 50_000_000 }]);
    expect(cal.moisParBesoin.get('x')).toBeNull();
  });

  it('calculs de mois', () => {
    expect(ecartMois('2026-10', '2027-01')).toBe(3);
    expect(ajouterMois('2026-11', 3)).toBe('2027-02');
  });
});
