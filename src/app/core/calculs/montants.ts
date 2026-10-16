/**
 * Formules de calcul de base. Toutes les formules métier passent par ce dossier
 * « calculs » : aucun montant n'est calculé directement dans les composants.
 * Les montants en FCFA sont arrondis à l'unité (le franc CFA n'a pas de centimes en usage).
 */

/** Convertit une valeur quelconque en nombre fini (0 sinon). */
export function nombre(valeur: unknown): number {
  const n = typeof valeur === 'number' ? valeur : Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

/** Arrondi d'un montant au franc près. */
export function arrondir(montant: number): number {
  return Math.round(nombre(montant));
}

/** Montant = Quantité × Prix unitaire. */
export function montantLigne(quantite: number, prixUnitaire: number): number {
  return arrondir(nombre(quantite) * nombre(prixUnitaire));
}

/** Somme d'une propriété calculée sur une liste. */
export function somme<T>(elements: readonly T[], valeur: (e: T) => number): number {
  return elements.reduce((total, e) => total + nombre(valeur(e)), 0);
}

/** Écart budgétaire = Dépenses réelles − Budget prévisionnel (positif = dépassement). */
export function ecartBudgetaire(depensesReelles: number, budgetPrevisionnel: number): number {
  return arrondir(nombre(depensesReelles) - nombre(budgetPrevisionnel));
}

/** Reste à payer = Montant total convenu − Montant déjà payé. */
export function resteAPayer(montantConvenu: number, montantPaye: number): number {
  return arrondir(nombre(montantConvenu) - nombre(montantPaye));
}

/** Réserve pour imprévus = Budget de base × pourcentage / 100. */
export function reserveImprevus(budgetBase: number, pourcentage: number): number {
  return arrondir(nombre(budgetBase) * Math.max(0, nombre(pourcentage)) / 100);
}

/** Part en pourcentage (0 si le total est nul). */
export function pourcentage(part: number, total: number): number {
  return total > 0 ? (nombre(part) / total) * 100 : 0;
}

/** Borne une valeur entre un minimum et un maximum. */
export function borner(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, nombre(valeur)));
}
