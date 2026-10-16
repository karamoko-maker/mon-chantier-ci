import { Financement, Id, MoisISO, RevenuExceptionnel } from '../models';
import { ajouterMois, ecartMois, moisDe } from './dates';
import { arrondir, nombre } from './montants';

/**
 * Montant disponible pour le chantier = épargne actuelle − dépenses personnelles à préserver.
 * Les revenus futurs ne sont JAMAIS inclus.
 */
export function montantDisponible(f: Financement): number {
  return arrondir(Math.max(0, nombre(f.epargneActuelle) - nombre(f.reservePersonnelle)));
}

/** Reste à financer = budget total − déjà payé − fonds disponibles (jamais négatif). */
export function resteAFinancer(budgetTotal: number, dejaPaye: number, disponible: number): number {
  return arrondir(Math.max(0, nombre(budgetTotal) - nombre(dejaPaye) - nombre(disponible)));
}

/**
 * Mois (index depuis le mois de départ) à partir duquel un revenu exceptionnel est compté.
 * Retourne null s'il ne doit pas être compté (déjà reçu, ou date passée sans réception).
 * Un revenu du mois en cours n'est compté qu'à partir du mois suivant : il n'est pas encore là.
 */
export function moisPriseEnCompte(r: RevenuExceptionnel, moisDebut: MoisISO): number | null {
  if (r.recu) return null;
  const idx = ecartMois(moisDebut, moisDe(r.datePrevue));
  if (idx < 0) return null;
  return Math.max(1, idx);
}

/**
 * Fonds cumulés disponibles au mois m (m = 0 : aujourd'hui, uniquement l'épargne réelle).
 */
export function fondsAuMois(f: Financement, revenus: readonly RevenuExceptionnel[], m: number): number {
  let fonds = montantDisponible(f);
  if (m >= 1) fonds += nombre(f.capaciteMensuelle) * m;
  for (const r of revenus) {
    const debut = moisPriseEnCompte(r, f.moisDebut);
    if (debut !== null && m >= debut) fonds += nombre(r.montant);
  }
  return arrondir(fonds);
}

/**
 * Nombre de mois avant d'atteindre un montant cible (0 = déjà atteint).
 * null si l'objectif n'est jamais atteint dans la limite fixée (épargne mensuelle nulle par ex.).
 */
export function moisPourAtteindre(
  cible: number,
  f: Financement,
  revenus: readonly RevenuExceptionnel[],
  limiteMois = 600,
): number | null {
  for (let m = 0; m <= limiteMois; m++) {
    if (fondsAuMois(f, revenus, m) >= nombre(cible)) return m;
  }
  return null;
}

export interface BesoinFinancement {
  id: Id;
  libelle: string;
  montant: number;
}

export interface LigneCalendrier {
  index: number;
  mois: MoisISO;
  apportEpargne: number;
  apportRevenus: number;
  fondsCumules: number;
  besoinCumuleFinance: number;
  /** Besoins (phases) qui deviennent finançables ce mois-ci. */
  nouveauxBesoins: BesoinFinancement[];
}

export interface CalendrierFinancement {
  lignes: LigneCalendrier[];
  /** Pour chaque besoin : index du mois où il devient finançable (null = au-delà de l'horizon). */
  moisParBesoin: Map<Id, number | null>;
  besoinTotal: number;
}

/**
 * Calendrier mensuel : les besoins sont financés dans l'ordre. Un besoin devient
 * « lançable » le premier mois où les fonds cumulés couvrent tous les besoins
 * jusqu'à lui inclus.
 */
export function calculerCalendrier(
  f: Financement,
  revenus: readonly RevenuExceptionnel[],
  besoins: readonly BesoinFinancement[],
): CalendrierFinancement {
  const horizon = Math.max(1, Math.min(240, Math.round(nombre(f.horizonMois)) || 36));
  const moisParBesoin = new Map<Id, number | null>(besoins.map((b) => [b.id, null]));
  const lignes: LigneCalendrier[] = [];
  let prochain = 0;
  let besoinCumule = 0;
  let fondsPrecedents = 0;

  for (let m = 0; m < horizon; m++) {
    const fonds = fondsAuMois(f, revenus, m);
    const apportEpargne = m === 0 ? montantDisponible(f) : nombre(f.capaciteMensuelle);
    const apportRevenus = m === 0 ? 0 : arrondir(fonds - fondsPrecedents - apportEpargne);
    const nouveaux: BesoinFinancement[] = [];
    while (prochain < besoins.length && besoinCumule + besoins[prochain].montant <= fonds) {
      besoinCumule += besoins[prochain].montant;
      moisParBesoin.set(besoins[prochain].id, m);
      nouveaux.push(besoins[prochain]);
      prochain++;
    }
    lignes.push({
      index: m,
      mois: ajouterMois(f.moisDebut, m),
      apportEpargne: arrondir(apportEpargne),
      apportRevenus: Math.max(0, apportRevenus),
      fondsCumules: fonds,
      besoinCumuleFinance: arrondir(besoinCumule),
      nouveauxBesoins: nouveaux,
    });
    fondsPrecedents = fonds;
  }
  return {
    lignes,
    moisParBesoin,
    besoinTotal: arrondir(besoins.reduce((s, b) => s + b.montant, 0)),
  };
}
