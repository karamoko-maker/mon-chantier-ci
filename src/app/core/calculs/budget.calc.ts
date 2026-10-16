import { PosteBudget } from '../constantes';
import { ChantierData, Id, Phase } from '../models';
import { coutEquipement } from './equipement.calc';
import { evaluerEnveloppes, montantConvenuIntervention, StatutEnveloppe } from './main-oeuvre.calc';
import { categorieDepense, CategorieMouvement, listerMouvements, Mouvement } from './mouvements.calc';
import { arrondir, ecartBudgetaire, montantLigne, nombre, reserveImprevus, somme } from './montants';

export type PostesBudget = Record<PosteBudget, number>;

const CLES_POSTES: readonly PosteBudget[] = ['materiaux', 'equipements', 'mainOeuvre', 'transport', 'fraisAnnexes', 'autres'];

export function postesVides(): PostesBudget {
  return { materiaux: 0, equipements: 0, mainOeuvre: 0, transport: 0, fraisAnnexes: 0, autres: 0 };
}

export function totalPostes(p: PostesBudget): number {
  return arrondir(p.materiaux + p.equipements + p.mainOeuvre + p.transport + p.fraisAnnexes + p.autres);
}

/** Données nécessaires à la synthèse budgétaire (le financement et les paramètres n'y entrent pas). */
export type DonneesBudget = Pick<
  ChantierData,
  'projet' | 'phases' | 'materiaux' | 'estimation' | 'achats' | 'equipements' | 'interventions' | 'enveloppes' | 'depenses'
>;

export interface BudgetPhase {
  phase: Phase;
  /** Détail du budget prévisionnel (estimatif) par poste. */
  postes: PostesBudget;
  /** Budget estimatif de base (somme des postes). */
  estimatif: number;
  /** Budget validé après étude technique (null si non validé). */
  valide: number | null;
  /** Budget de référence = validé s'il existe, sinon estimatif. */
  reference: number;
  /** Engagé par les commandes, contrats et factures. */
  engage: number;
  /** Effectivement payé. */
  paye: number;
  /** Écart budgétaire = payé − référence. */
  ecart: number;
  /** Dépassement constaté (payé > référence) ou prévisible (engagé > référence). */
  depassement: 'aucun' | 'previsible' | 'constate';
  /** Économie réalisée (uniquement pour une phase terminée). */
  economie: number;
}

export interface MontantsParCategorie {
  materiaux: number;
  mainOeuvre: number;
  equipements: number;
  transport: number;
  fraisAnnexes: number;
  imprevus: number;
  total: number;
}

export interface SyntheseBudget {
  /** Postes du budget estimatif (toutes phases + éléments non répartis). */
  postes: PostesBudget;
  /** 1. Budget estimatif de base (hors réserve). */
  baseEstimatif: number;
  pourcentageReserve: number;
  reserveEstimatif: number;
  /** 1. Budget estimatif initial total = base + réserve. */
  totalEstimatif: number;
  /** 2. Budget validé après étude technique (somme des phases validées). */
  totalValide: number;
  nombrePhasesValidees: number;
  /** Base de référence : validé quand il existe, estimatif sinon. */
  baseReference: number;
  reserveReference: number;
  /** Budget total de référence (base de référence + réserve). */
  totalReference: number;
  /** Éléments non encore affectés à une phase. */
  nonAffecte: { postes: PostesBudget; estimatif: number; engage: number; paye: number };
  phases: BudgetPhase[];
  /** 3. Budget engagé par catégorie. */
  engage: MontantsParCategorie;
  /** 4. Montant effectivement payé par catégorie. */
  paye: MontantsParCategorie;
  /** Budget restant = budget de référence − payé. */
  resteBudget: number;
  /** Réserve pour imprévus restante après les dépenses imprévues payées. */
  reserveRestante: number;
  avancementGlobal: number;
  phaseActuelle: BudgetPhase | null;
  prochainesPhases: BudgetPhase[];
  statutsEnveloppes: StatutEnveloppe[];
  mouvements: Mouvement[];
}

function montantsVides(): MontantsParCategorie {
  return { materiaux: 0, mainOeuvre: 0, equipements: 0, transport: 0, fraisAnnexes: 0, imprevus: 0, total: 0 };
}

/** Clé de regroupement : la phase, ou NON_AFFECTE si l'élément n'a pas de phase connue. */
const NON_AFFECTE = '';

/**
 * Accumulateur par phase, rempli en UNE passe sur chaque collection
 * (au lieu de filtrer toutes les collections pour chaque phase).
 */
interface Accumulateur {
  postes: PostesBudget;
  engage: number;
  paye: number;
}

function accumulateur(): Accumulateur {
  return { postes: postesVides(), engage: 0, paye: 0 };
}

/** Avancement global pondéré par le budget de référence (moyenne simple si aucun budget). */
export function avancementGlobal(phases: readonly { reference: number; phase: Phase }[]): number {
  if (phases.length === 0) return 0;
  const total = somme(phases, (p) => p.reference);
  if (total > 0) return somme(phases, (p) => p.reference * nombre(p.phase.avancement)) / total;
  return somme(phases, (p) => nombre(p.phase.avancement)) / phases.length;
}

/**
 * Synthèse budgétaire complète du chantier. Fonction pure : mêmes données → même résultat.
 * Distingue : estimatif initial, validé, engagé, payé, et (via le financement) reste à financer.
 * Complexité linéaire : chaque collection est parcourue une seule fois.
 */
export function calculerSynthese(data: DonneesBudget): SyntheseBudget {
  const statuts = evaluerEnveloppes(data.enveloppes, data.interventions);
  const mouvements = listerMouvements(data);
  const phasesTriees = [...data.phases].sort((a, b) => a.ordre - b.ordre);

  // Un accumulateur par phase existante + un pour les éléments non affectés.
  const acc = new Map<string, Accumulateur>();
  for (const p of phasesTriees) acc.set(p.id, accumulateur());
  const nonAff = accumulateur();
  acc.set(NON_AFFECTE, nonAff);
  const de = (phaseId: Id | null): Accumulateur => (phaseId !== null && acc.get(phaseId)) || nonAff;

  // Postes du budget estimatif
  const prix = new Map<string, number>();
  for (const m of data.materiaux) prix.set(m.id, m.prixUnitaire);
  for (const l of data.estimation) {
    if (l.inclureAuBudget) de(l.phaseId).postes.materiaux += montantLigne(l.quantite, prix.get(l.materiauId) ?? 0);
  }
  for (const e of data.equipements) de(e.phaseId).postes.equipements += coutEquipement(e);
  for (const i of data.interventions) de(i.phaseId).postes.mainOeuvre += montantConvenuIntervention(i);
  for (const s of statuts) if (s.comptee) de(s.enveloppe.phaseId).postes.mainOeuvre += nombre(s.enveloppe.montantRetenu);
  for (const d of data.depenses) {
    // Les dépenses imprévues consomment la réserve : elles ne gonflent pas le budget de base.
    const cat = categorieDepense(d);
    if (cat === 'transport') de(d.phaseId).postes.transport += nombre(d.montantPrevu);
    else if (cat === 'fraisAnnexes') de(d.phaseId).postes.fraisAnnexes += nombre(d.montantPrevu);
  }

  // Engagé / payé : par phase et par catégorie, dans la même boucle.
  const engage = montantsVides();
  const paye = montantsVides();
  for (const m of mouvements) {
    const a = de(m.phaseId);
    a.engage += m.engage;
    a.paye += m.paye;
    engage[m.categorie as CategorieMouvement] += m.engage;
    engage.total += m.engage;
    paye[m.categorie as CategorieMouvement] += m.paye;
    paye.total += m.paye;
  }

  const phases: BudgetPhase[] = phasesTriees.map((phase) => {
    const a = acc.get(phase.id)!;
    a.postes.autres = nombre(phase.autresCouts);
    for (const k of CLES_POSTES) a.postes[k] = arrondir(a.postes[k]);
    const estimatif = totalPostes(a.postes);
    const valide = phase.budgetValide === null ? null : arrondir(phase.budgetValide);
    const reference = valide ?? estimatif;
    const depassement: BudgetPhase['depassement'] =
      reference > 0 && a.paye > reference ? 'constate' : reference > 0 && a.engage > reference ? 'previsible' : 'aucun';
    return {
      phase,
      postes: a.postes,
      estimatif,
      valide,
      reference,
      engage: a.engage,
      paye: a.paye,
      ecart: ecartBudgetaire(a.paye, reference),
      depassement,
      economie: phase.statut === 'termine' && a.paye < reference ? arrondir(reference - a.paye) : 0,
    };
  });

  for (const k of CLES_POSTES) nonAff.postes[k] = arrondir(nonAff.postes[k]);
  const nonAffecte = { postes: nonAff.postes, estimatif: totalPostes(nonAff.postes), engage: nonAff.engage, paye: nonAff.paye };

  const postes = postesVides();
  for (const source of [...phases.map((p) => p.postes), nonAff.postes]) {
    for (const k of CLES_POSTES) postes[k] += source[k];
  }

  const pct = nombre(data.projet.pourcentageReserve);
  const baseEstimatif = totalPostes(postes);
  const reserveEstimatif = reserveImprevus(baseEstimatif, pct);
  let totalValide = 0;
  let nombrePhasesValidees = 0;
  let sommeReferences = 0;
  for (const p of phases) {
    sommeReferences += p.reference;
    if (p.valide !== null) {
      totalValide += p.valide;
      nombrePhasesValidees++;
    }
  }
  const baseReference = arrondir(sommeReferences + nonAffecte.estimatif);
  const reserveReference = reserveImprevus(baseReference, pct);
  const totalReference = baseReference + reserveReference;

  const nonTerminees = phases.filter((p) => p.phase.statut !== 'termine');
  const phaseActuelle = phases.find((p) => p.phase.statut === 'en_cours') ?? nonTerminees[0] ?? null;

  return {
    postes,
    baseEstimatif,
    pourcentageReserve: pct,
    reserveEstimatif,
    totalEstimatif: baseEstimatif + reserveEstimatif,
    totalValide,
    nombrePhasesValidees,
    baseReference,
    reserveReference,
    totalReference,
    nonAffecte,
    phases,
    engage,
    paye,
    resteBudget: arrondir(totalReference - paye.total),
    reserveRestante: arrondir(reserveReference - paye.imprevus),
    avancementGlobal: avancementGlobal(phases),
    phaseActuelle,
    prochainesPhases: nonTerminees.slice(0, 4),
    statutsEnveloppes: statuts,
    mouvements,
  };
}
