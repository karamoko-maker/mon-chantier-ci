import { Achat, Consommation, LigneEstimation, Materiau } from '../models';
import { arrondir, montantLigne, nombre } from './montants';
import { groupe, grouperPar } from './regroupement';

/** Arrondi des quantités à 3 décimales (évite les 0,30000000004). */
export function arrondirQuantite(q: number): number {
  return Math.round(nombre(q) * 1000) / 1000;
}

export interface EtatStock {
  materiau: Materiau;
  /** Quantité prévue (lignes d'estimation incluses au budget). */
  prevu: number;
  /** Quantité commandée (achats). */
  commande: number;
  /** Quantité reçue / livrée. */
  recu: number;
  /** Quantité consommée sur le chantier. */
  consomme: number;
  /** Stock disponible = reçu − consommé. */
  disponible: number;
  /** Commandé mais pas encore livré. */
  enAttenteLivraison: number;
  /** Prévu mais pas encore commandé. */
  resteACommander: number;
  /** Montant prévu = quantité prévue × prix catalogue. */
  montantPrevu: number;
  faible: boolean;
  negatif: boolean;
}

/**
 * État du stock d'un matériau à partir de listes DÉJÀ restreintes à ce matériau
 * (une seule boucle par liste, sans filtrage).
 */
function etatDepuisListes(
  materiau: Materiau,
  lignes: readonly LigneEstimation[],
  achats: readonly Achat[],
  consommations: readonly Consommation[],
): EtatStock {
  let prevu = 0;
  for (const l of lignes) if (l.inclureAuBudget) prevu += nombre(l.quantite);
  let commande = 0;
  let recu = 0;
  for (const a of achats) {
    commande += nombre(a.quantiteCommandee);
    recu += nombre(a.quantiteLivree);
  }
  let consomme = 0;
  for (const c of consommations) consomme += nombre(c.quantite);

  prevu = arrondirQuantite(prevu);
  commande = arrondirQuantite(commande);
  recu = arrondirQuantite(recu);
  consomme = arrondirQuantite(consomme);
  const disponible = arrondirQuantite(recu - consomme);
  const seuil = nombre(materiau.seuilAlerte);
  return {
    materiau,
    prevu,
    commande,
    recu,
    consomme,
    disponible,
    enAttenteLivraison: arrondirQuantite(Math.max(0, commande - recu)),
    resteACommander: arrondirQuantite(Math.max(0, prevu - commande)),
    montantPrevu: montantLigne(prevu, materiau.prixUnitaire),
    faible: seuil > 0 && recu > 0 && disponible >= 0 && disponible <= seuil,
    negatif: disponible < 0,
  };
}

/** État du stock d'un seul matériau (les listes peuvent contenir d'autres matériaux). */
export function calculerEtatStock(
  materiau: Materiau,
  lignes: readonly LigneEstimation[],
  achats: readonly Achat[],
  consommations: readonly Consommation[],
): EtatStock {
  const id = materiau.id;
  return etatDepuisListes(
    materiau,
    lignes.filter((l) => l.materiauId === id),
    achats.filter((a) => a.materiauId === id),
    consommations.filter((c) => c.materiauId === id),
  );
}

/** États de stock de tous les matériaux : chaque liste n'est parcourue qu'une fois. */
export function calculerStocks(
  materiaux: readonly Materiau[],
  lignes: readonly LigneEstimation[],
  achats: readonly Achat[],
  consommations: readonly Consommation[],
): EtatStock[] {
  const lignesParMat = grouperPar(lignes, (l) => l.materiauId);
  const achatsParMat = grouperPar(achats, (a) => a.materiauId);
  const consoParMat = grouperPar(consommations, (c) => c.materiauId);
  return materiaux.map((m) =>
    etatDepuisListes(m, groupe(lignesParMat, m.id), groupe(achatsParMat, m.id), groupe(consoParMat, m.id)),
  );
}

/** Montant total d'un achat = quantité commandée × prix unitaire. */
export function montantAchat(a: Achat): number {
  return montantLigne(a.quantiteCommandee, a.prixUnitaire);
}

/** Solde dû au fournisseur = montant total − montant payé. */
export function soldeAchat(a: Achat): number {
  return arrondir(montantAchat(a) - nombre(a.montantPaye));
}

export type StatutLivraison = 'commande' | 'partiel' | 'livre' | 'excedent';

export function statutLivraison(a: Achat): StatutLivraison {
  const cmd = nombre(a.quantiteCommandee);
  const liv = nombre(a.quantiteLivree);
  if (liv <= 0) return 'commande';
  if (liv < cmd) return 'partiel';
  if (liv > cmd) return 'excedent';
  return 'livre';
}
