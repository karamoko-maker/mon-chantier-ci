import { MENTION_ESTIMATION } from '../constantes';
import { ChantierData } from '../models';
import { DonneesBudget, SyntheseBudget } from './budget.calc';
import { aujourdhuiISO } from './dates';
import { coutEquipement } from './equipement.calc';
import { formatFcfa } from './format';
import { normaliserLibelle } from './identifiant';
import { detecterDoublonsForfait } from './main-oeuvre.calc';
import { nombre } from './montants';
import { EtatStock } from './stock.calc';
import { indexerParId } from './regroupement';

/** Données lues par les contrôles (le plan d'épargne n'est utilisé que pour les revenus). */
export type DonneesControles = DonneesBudget & Pick<ChantierData, 'revenus'>;

export type NiveauAlerte = 'info' | 'attention' | 'danger';

export interface Alerte {
  niveau: NiveauAlerte;
  module: string;
  message: string;
  lien: string;
}

/**
 * Contrôles de cohérence : doubles comptages, dépassements, stocks, validation technique…
 * Ces alertes sont affichées sur le tableau de bord et dans les modules concernés.
 */
export function genererAlertes(
  data: DonneesControles,
  synthese: SyntheseBudget,
  stocks: readonly EtatStock[],
  aujourdhui = aujourdhuiISO(),
): Alerte[] {
  const alertes: Alerte[] = [];
  const nomPhase = new Map(data.phases.map((p) => [p.id, p.nom]));
  // Index construit une fois : évite un `find` sur le catalogue pour chaque ligne.
  const materiaux = indexerParId(data.materiaux);

  // 1. Validation technique
  if (!data.projet.metreValide) {
    alertes.push({
      niveau: 'attention',
      module: 'Projet',
      message: `${MENTION_ESTIMATION} : le métré technique n'a pas encore été validé.`,
      lien: '/projet',
    });
  }
  const structurelsHypothese = data.estimation.filter((l) => {
    const m = materiaux.get(l.materiauId);
    return m?.structurel && l.source === 'hypothese' && l.inclureAuBudget;
  });
  if (structurelsHypothese.length > 0) {
    alertes.push({
      niveau: 'attention',
      module: 'Matériaux',
      message: `${structurelsHypothese.length} quantité(s) d'éléments structurels (ciment, fer, granulats…) reposent sur des hypothèses : à remplacer par le métré de l'ingénieur.`,
      lien: '/materiaux',
    });
  }
  const nonAffectees = data.estimation.filter((l) => l.phaseId === null && l.inclureAuBudget);
  if (nonAffectees.length > 0) {
    alertes.push({
      niveau: 'info',
      module: 'Matériaux',
      message: `${nonAffectees.length} ligne(s) d'estimation ne sont pas encore réparties par phase (${formatFcfa(synthese.nonAffecte.postes.materiaux)}).`,
      lien: '/materiaux',
    });
  }

  // 2. Doubles comptages de main-d'œuvre
  for (const d of detecterDoublonsForfait(data.interventions)) {
    alertes.push({
      niveau: 'danger',
      module: "Main-d'œuvre",
      message: `Double comptage possible : l'intervention « ${d.intervention.metier} » est déjà couverte par le forfait « ${d.forfait.prestataire || d.forfait.metier} ».`,
      lien: '/main-oeuvre',
    });
  }
  const enveloppesExclues = synthese.statutsEnveloppes.filter(
    (s) => !s.comptee && s.enveloppe.inclureAuBudget,
  );
  if (enveloppesExclues.length > 0) {
    alertes.push({
      niveau: 'info',
      module: "Main-d'œuvre",
      message: `${enveloppesExclues.length} enveloppe(s) de planification automatiquement exclue(s) du budget pour éviter un double comptage.`,
      lien: '/main-oeuvre',
    });
  }

  // 3. Doubles comptages équipements / matériaux
  const coutEquipements = data.equipements.reduce((s, e) => s + coutEquipement(e), 0);
  const lotMateriel = data.estimation.filter((l) => {
    const m = materiaux.get(l.materiauId);
    return l.inclureAuBudget && m?.categorie === 'Matériel de chantier';
  });
  if (coutEquipements > 0 && lotMateriel.length > 0) {
    alertes.push({
      niveau: 'attention',
      module: 'Équipements',
      message: `Double comptage possible : le lot « Matériel de chantier » de l'estimation et l'inventaire des équipements (${formatFcfa(coutEquipements)}) sont tous deux inclus au budget. Excluez l'un des deux.`,
      lien: '/equipements',
    });
  }
  const nomsEquipementsPayants = new Set(
    data.equipements.filter((e) => coutEquipement(e) > 0).map((e) => normaliserLibelle(e.nom)),
  );
  for (const l of data.estimation.filter((x) => x.inclureAuBudget)) {
    const m = materiaux.get(l.materiauId);
    if (m && nomsEquipementsPayants.has(normaliserLibelle(m.nom))) {
      alertes.push({
        niveau: 'attention',
        module: 'Équipements',
        message: `« ${m.nom} » figure à la fois dans l'estimation des matériaux et dans l'inventaire des équipements.`,
        lien: '/equipements',
      });
    }
  }
  const vus = new Map<string, number>();
  for (const e of data.equipements.filter((x) => x.mode === 'achete' && coutEquipement(x) > 0)) {
    const cle = normaliserLibelle(e.nom);
    vus.set(cle, (vus.get(cle) ?? 0) + 1);
  }
  for (const [cle, n] of vus) {
    if (n > 1) {
      alertes.push({
        niveau: 'attention',
        module: 'Équipements',
        message: `L'équipement « ${cle} » est acheté ${n} fois : vérifiez qu'il ne s'agit pas d'un doublon d'une phase précédente.`,
        lien: '/equipements',
      });
    }
  }

  // 4. Budgets des phases
  for (const p of synthese.phases) {
    if (p.depassement === 'constate') {
      alertes.push({
        niveau: 'danger',
        module: 'Phases',
        message: `Dépassement sur « ${p.phase.nom} » : ${formatFcfa(p.ecart)} au-delà du budget.`,
        lien: `/phases/${p.phase.id}`,
      });
    } else if (p.depassement === 'previsible') {
      alertes.push({
        niveau: 'attention',
        module: 'Phases',
        message: `Dépassement prévisible sur « ${p.phase.nom} » : les engagements dépassent le budget de ${formatFcfa(p.engage - p.reference)}.`,
        lien: `/phases/${p.phase.id}`,
      });
    }
    if (p.phase.dateDebut && p.phase.dateFin && p.phase.dateFin < p.phase.dateDebut) {
      alertes.push({
        niveau: 'attention',
        module: 'Phases',
        message: `La date de fin de « ${p.phase.nom} » est antérieure à sa date de début.`,
        lien: `/phases/${p.phase.id}`,
      });
    }
  }
  if (synthese.reserveRestante < 0) {
    alertes.push({
      niveau: 'danger',
      module: 'Dépenses',
      message: `Les dépenses imprévues dépassent la réserve de ${formatFcfa(-synthese.reserveRestante)}.`,
      lien: '/depenses',
    });
  }

  // 5. Stocks et achats
  regrouper(alertes, stocks.filter((s) => s.negatif), 'danger', 'Stocks', '/achats-stocks',
    (s) => `Stock négatif pour « ${s.materiau.nom} » : la consommation dépasse les quantités reçues.`,
    (n) => `${n} matériaux ont un stock négatif : la consommation dépasse les quantités reçues.`);
  regrouper(alertes, stocks.filter((s) => s.faible), 'attention', 'Stocks', '/achats-stocks',
    (s) => `Stock faible : « ${s.materiau.nom} » (${s.disponible} ${s.materiau.unite} disponibles).`,
    (n) => `${n} matériaux ont un stock faible (sous leur seuil d'alerte).`);
  const excedents = data.achats.filter((a) => nombre(a.quantiteLivree) > nombre(a.quantiteCommandee));
  regrouper(alertes, excedents, 'attention', 'Achats', '/achats-stocks',
    (a) => `Livraison supérieure à la commande pour « ${materiaux.get(a.materiauId)?.nom ?? 'matériau'} » (réf. ${a.reference || 'sans référence'}).`,
    (n) => `${n} livraisons sont supérieures à la quantité commandée.`);

  // 6. Dépenses
  regrouper(alertes, data.depenses.filter((d) => d.etape === 'prevue' && nombre(d.montantPaye) > 0), 'info', 'Dépenses', '/depenses',
    (d) => `« ${d.description} » est payée mais toujours à l'étape « prévue » : précisez s'il y a eu commande ou facture.`,
    (n) => `${n} dépenses sont payées mais toujours à l'étape « prévue » : précisez s'il y a eu commande ou facture.`);
  regrouper(alertes, data.depenses.filter((d) => !d.phaseId || !nomPhase.has(d.phaseId)), 'attention', 'Dépenses', '/depenses',
    (d) => `La dépense « ${d.description} » n'est affectée à aucune phase.`,
    (n) => `${n} dépenses ne sont affectées à aucune phase.`);

  // 7. Financement
  for (const r of data.revenus) {
    if (!r.recu && r.datePrevue < aujourdhui) {
      alertes.push({
        niveau: 'info',
        module: 'Épargne',
        message: `Le revenu « ${r.libelle} » prévu le ${r.datePrevue.split('-').reverse().join('/')} n'est pas marqué comme reçu : il n'est plus compté.`,
        lien: '/epargne',
      });
    }
  }
  return alertes;
}

/** Au-delà de ce nombre d'éléments, une seule alerte récapitulative remplace les alertes individuelles. */
const SEUIL_REGROUPEMENT = 3;

/** Ajoute une alerte par élément, ou une alerte unique si les éléments sont nombreux. */
function regrouper<T>(
  alertes: Alerte[],
  elements: readonly T[],
  niveau: NiveauAlerte,
  module: string,
  lien: string,
  individuel: (e: T) => string,
  recapitulatif: (n: number) => string,
): void {
  if (elements.length > SEUIL_REGROUPEMENT) {
    alertes.push({ niveau, module, lien, message: recapitulatif(elements.length) });
    return;
  }
  for (const e of elements) alertes.push({ niveau, module, lien, message: individuel(e) });
}
