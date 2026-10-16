import { EnveloppeMainOeuvre, Id, Intervention } from '../models';
import { arrondir, nombre, resteAPayer, somme } from './montants';

/**
 * Montant convenu d'une intervention.
 * - Journalier : Nombre de personnes × Tarif journalier × Nombre de jours (+ heures supplémentaires).
 * - Forfait : montant du forfait.
 */
export function montantConvenuIntervention(i: Omit<Intervention, 'id'>): number {
  if (i.mode === 'forfait') return arrondir(i.montantForfait);
  const base = nombre(i.nombrePersonnes) * nombre(i.tarifJournalier) * nombre(i.nombreJours);
  const heuresSup = nombre(i.heuresSupplementaires) * nombre(i.tarifHoraireSup);
  return arrondir(base + heuresSup);
}

/** Reste à payer d'une intervention (négatif = trop versé). */
export function resteAPayerIntervention(i: Intervention): number {
  return resteAPayer(montantConvenuIntervention(i), i.montantPaye);
}

export interface StatutEnveloppe {
  enveloppe: EnveloppeMainOeuvre;
  /** L'enveloppe est-elle comptée dans le budget ? */
  comptee: boolean;
  raison: string;
}

/** Une intervention est-elle dans le périmètre d'une phase (null = tout le chantier) ? */
function dansPerimetre(phaseId: Id | null, i: Intervention): boolean {
  return phaseId === null || i.phaseId === phaseId;
}

/**
 * Contrôle anti-double comptage des enveloppes de planification :
 * une enveloppe n'est PAS comptée si un forfait couvre déjà ce métier,
 * ou si des interventions réelles ont été saisies pour ce métier.
 */
export function evaluerEnveloppes(
  enveloppes: readonly EnveloppeMainOeuvre[],
  interventions: readonly Intervention[],
): StatutEnveloppe[] {
  return enveloppes.map((e) => {
    if (!e.inclureAuBudget) {
      return { enveloppe: e, comptee: false, raison: 'Non incluse au budget (choix utilisateur)' };
    }
    const perimetre = interventions.filter((i) => dansPerimetre(e.phaseId, i));
    const forfait = perimetre.find(
      (i) => i.mode === 'forfait' && i.metier !== e.metier && i.prestationsCouvertes.includes(e.metier),
    );
    if (forfait) {
      const nom = forfait.prestataire || forfait.metier;
      return { enveloppe: e, comptee: false, raison: `Exclue : déjà couverte par le forfait « ${nom} »` };
    }
    if (perimetre.some((i) => i.metier === e.metier)) {
      return { enveloppe: e, comptee: false, raison: 'Remplacée par les interventions saisies' };
    }
    return { enveloppe: e, comptee: true, raison: 'Comptée comme enveloppe de planification' };
  });
}

export interface DoublonForfait {
  intervention: Intervention;
  forfait: Intervention;
}

/**
 * Détecte les interventions dont le métier est déjà couvert par un forfait
 * sur la même phase (risque de payer deux fois la même prestation).
 */
export function detecterDoublonsForfait(interventions: readonly Intervention[]): DoublonForfait[] {
  const forfaits = interventions.filter((i) => i.mode === 'forfait' && i.prestationsCouvertes.length > 0);
  const doublons: DoublonForfait[] = [];
  for (const i of interventions) {
    for (const f of forfaits) {
      if (f.id === i.id) continue;
      const memePhase = f.phaseId === null || i.phaseId === f.phaseId;
      if (memePhase && f.prestationsCouvertes.includes(i.metier)) {
        doublons.push({ intervention: i, forfait: f });
      }
    }
  }
  return doublons;
}

/** Budget de main-d'œuvre prévu = interventions convenues + enveloppes comptées. */
export function budgetMainOeuvre(
  interventions: readonly Intervention[],
  statuts: readonly StatutEnveloppe[],
): number {
  return (
    somme(interventions, montantConvenuIntervention) +
    somme(statuts.filter((s) => s.comptee), (s) => s.enveloppe.montantRetenu)
  );
}

export interface LigneRecapMainOeuvre {
  cle: string;
  libelle: string;
  nombreInterventions: number;
  convenu: number;
  enveloppes: number;
  paye: number;
  reste: number;
}

/** Récapitulatif regroupé (par métier ou par phase). */
export function recapitulerMainOeuvre(
  interventions: readonly Intervention[],
  statuts: readonly StatutEnveloppe[],
  cleIntervention: (i: Intervention) => string,
  cleEnveloppe: (e: EnveloppeMainOeuvre) => string,
  libelle: (cle: string) => string,
): LigneRecapMainOeuvre[] {
  const lignes = new Map<string, LigneRecapMainOeuvre>();
  const ligne = (cle: string): LigneRecapMainOeuvre => {
    let l = lignes.get(cle);
    if (!l) {
      l = { cle, libelle: libelle(cle), nombreInterventions: 0, convenu: 0, enveloppes: 0, paye: 0, reste: 0 };
      lignes.set(cle, l);
    }
    return l;
  };
  for (const i of interventions) {
    const l = ligne(cleIntervention(i));
    l.nombreInterventions++;
    l.convenu += montantConvenuIntervention(i);
    l.paye += nombre(i.montantPaye);
  }
  for (const s of statuts.filter((x) => x.comptee)) {
    ligne(cleEnveloppe(s.enveloppe)).enveloppes += nombre(s.enveloppe.montantRetenu);
  }
  for (const l of lignes.values()) l.reste = resteAPayer(l.convenu, l.paye);
  return [...lignes.values()];
}
