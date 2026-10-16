import { LIBELLES_CATEGORIE_DEPENSE } from '../constantes';
import { ChantierData, DateISO, Depense, Id } from '../models';
import { coutEquipement } from './equipement.calc';
import { montantConvenuIntervention } from './main-oeuvre.calc';
import { arrondir, nombre } from './montants';
import { montantAchat } from './stock.calc';
import { comparerDates } from './regroupement';

/** Données nécessaires pour lister les mouvements financiers. */
export type DonneesMouvements = Pick<ChantierData, 'materiaux' | 'achats' | 'interventions' | 'equipements' | 'depenses'>;

export type SourceMouvement = 'achat' | 'main_oeuvre' | 'equipement' | 'depense';
export type CategorieMouvement =
  | 'materiaux'
  | 'mainOeuvre'
  | 'equipements'
  | 'transport'
  | 'fraisAnnexes'
  | 'imprevus';

/**
 * Mouvement financier consolidé. Chaque engagement / paiement n'est saisi qu'à un seul endroit
 * (achat, intervention, équipement ou dépense) : cette vue les rassemble sans double saisie.
 */
export interface Mouvement {
  source: SourceMouvement;
  id: Id;
  date: DateISO | null;
  libelle: string;
  categorie: CategorieMouvement;
  phaseId: Id | null;
  /** Montant engagé (commande, contrat, facture). */
  engage: number;
  /** Montant effectivement payé. */
  paye: number;
  beneficiaire: string;
  reference: string;
}

/** Catégorie budgétaire d'une dépense du registre. */
export function categorieDepense(d: Depense): CategorieMouvement {
  if (d.categorie === 'transport') return 'transport';
  if (d.categorie === 'imprevus') return 'imprevus';
  return 'fraisAnnexes';
}

/**
 * Montant engagé d'une dépense : rien tant qu'elle n'est que « prévue »
 * (sauf si un paiement a déjà eu lieu), sinon le plus grand du prévu et du payé.
 */
export function montantEngageDepense(d: Depense): number {
  if (d.etape === 'prevue') return arrondir(d.montantPaye);
  return arrondir(Math.max(nombre(d.montantPrevu), nombre(d.montantPaye)));
}

export function listerMouvements(data: DonneesMouvements): Mouvement[] {
  const nomMateriau = new Map(data.materiaux.map((m) => [m.id, m.nom]));
  const mouvements: Mouvement[] = [];

  for (const a of data.achats) {
    mouvements.push({
      source: 'achat',
      id: a.id,
      date: a.date,
      libelle: `Achat : ${nomMateriau.get(a.materiauId) ?? 'matériau supprimé'}`,
      categorie: 'materiaux',
      phaseId: a.phaseId,
      engage: montantAchat(a),
      paye: arrondir(a.montantPaye),
      beneficiaire: a.fournisseur,
      reference: a.reference,
    });
  }
  for (const i of data.interventions) {
    mouvements.push({
      source: 'main_oeuvre',
      id: i.id,
      date: i.date,
      libelle: `Main-d'œuvre : ${i.metier}${i.prestataire ? ' — ' + i.prestataire : ''}`,
      categorie: 'mainOeuvre',
      phaseId: i.phaseId,
      engage: montantConvenuIntervention(i),
      paye: arrondir(i.montantPaye),
      beneficiaire: i.prestataire,
      reference: '',
    });
  }
  for (const e of data.equipements) {
    if (e.mode === 'disponible') continue;
    const cout = coutEquipement(e);
    if (cout === 0 && nombre(e.montantPaye) === 0) continue;
    mouvements.push({
      source: 'equipement',
      id: e.id,
      date: e.dateAcquisition,
      libelle: `Équipement ${e.mode === 'loue' ? 'loué' : 'acheté'} : ${e.nom}`,
      categorie: 'equipements',
      phaseId: e.phaseId,
      engage: cout,
      paye: arrondir(e.montantPaye),
      beneficiaire: e.fournisseur,
      reference: '',
    });
  }
  for (const d of data.depenses) {
    mouvements.push({
      source: 'depense',
      id: d.id,
      date: d.date,
      libelle: `${LIBELLES_CATEGORIE_DEPENSE[d.categorie]} : ${d.description}`,
      categorie: categorieDepense(d),
      phaseId: d.phaseId,
      engage: montantEngageDepense(d),
      paye: arrondir(d.montantPaye),
      beneficiaire: d.beneficiaire,
      reference: d.reference,
    });
  }
  return mouvements.sort((a, b) => comparerDates(a.date, b.date));
}

export interface PointEvolution {
  mois: string;
  payeDuMois: number;
  payeCumule: number;
}

/** Évolution mensuelle des paiements effectifs (cumulés). */
export function evolutionPaiements(mouvements: readonly Mouvement[]): PointEvolution[] {
  const parMois = new Map<string, number>();
  for (const m of mouvements) {
    if (!m.date || m.paye === 0) continue;
    const mois = m.date.slice(0, 7);
    parMois.set(mois, (parMois.get(mois) ?? 0) + m.paye);
  }
  let cumul = 0;
  return [...parMois.entries()]
    .sort(([a], [b]) => comparerDates(a, b))
    .map(([mois, paye]) => {
      cumul += paye;
      return { mois, payeDuMois: paye, payeCumule: cumul };
    });
}
