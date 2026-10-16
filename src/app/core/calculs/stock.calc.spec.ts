import { Achat, Consommation, LigneEstimation, Materiau } from '../models';
import { calculerEtatStock, montantAchat, soldeAchat, statutLivraison } from './stock.calc';

const ciment: Materiau = {
  id: 'm', nom: 'Ciment', categorie: 'Liants', unite: 'sac', prixUnitaire: 5_000, originePrix: 'hypothese',
  fournisseur: '', dateMajPrix: null, seuilAlerte: 20, structurel: true, notes: '',
};
const ligne: LigneEstimation = {
  id: 'l', materiauId: 'm', phaseId: null, quantite: 250, source: 'hypothese', valide: false, inclureAuBudget: true, commentaire: '',
};
function achat(p: Partial<Achat>): Achat {
  return {
    id: 'a', date: '2026-10-01', materiauId: 'm', phaseId: null, quantiteCommandee: 100, quantiteLivree: 100,
    prixUnitaire: 5_000, fournisseur: '', modePaiement: '', montantPaye: 0, reference: '', commentaire: '', ...p,
  };
}
const sortie = (q: number): Consommation => ({ id: 'c' + q, date: '2026-10-02', materiauId: 'm', phaseId: null, quantite: q, commentaire: '' });

describe('Achats et stocks', () => {
  it('Montant total et solde dû d’un achat', () => {
    const a = achat({ montantPaye: 300_000 });
    expect(montantAchat(a)).toBe(500_000);
    expect(soldeAchat(a)).toBe(200_000);
  });

  it('distingue commandé, reçu, consommé et disponible', () => {
    const s = calculerEtatStock(ciment, [ligne], [achat({ quantiteCommandee: 120, quantiteLivree: 100 })], [sortie(30)]);
    expect(s.prevu).toBe(250);
    expect(s.commande).toBe(120);
    expect(s.recu).toBe(100);
    expect(s.consomme).toBe(30);
    expect(s.disponible).toBe(70);
    expect(s.enAttenteLivraison).toBe(20);
    expect(s.resteACommander).toBe(130);
    expect(s.montantPrevu).toBe(1_250_000);
  });

  it('signale un stock faible et un stock négatif', () => {
    expect(calculerEtatStock(ciment, [], [achat({})], [sortie(85)]).faible).toBe(true);
    expect(calculerEtatStock(ciment, [], [achat({})], [sortie(110)]).negatif).toBe(true);
    expect(calculerEtatStock(ciment, [], [achat({})], [sortie(10)]).faible).toBe(false);
  });

  it('ignore les lignes exclues du budget dans la quantité prévue', () => {
    expect(calculerEtatStock(ciment, [{ ...ligne, inclureAuBudget: false }], [], []).prevu).toBe(0);
  });

  it('évite les erreurs d’arrondi sur les quantités décimales', () => {
    const s = calculerEtatStock(ciment, [], [achat({ quantiteLivree: 0.3, quantiteCommandee: 0.3 })], [sortie(0.1), sortie(0.2)]);
    expect(s.disponible).toBe(0);
  });

  it('statut de livraison', () => {
    expect(statutLivraison(achat({ quantiteLivree: 0 }))).toBe('commande');
    expect(statutLivraison(achat({ quantiteLivree: 50 }))).toBe('partiel');
    expect(statutLivraison(achat({}))).toBe('livre');
    expect(statutLivraison(achat({ quantiteLivree: 110 }))).toBe('excedent');
  });
});
