/**
 * Outils de regroupement en une seule passe.
 * Ils remplacent les `filter`/`find` répétés dans des boucles (coût O(n × m))
 * par un index construit une fois (coût O(n)).
 */

/** Regroupe les éléments d'une liste selon une clé : Map<clé, éléments>. */
export function grouperPar<T, K>(liste: readonly T[], cle: (e: T) => K): Map<K, T[]> {
  const groupes = new Map<K, T[]>();
  for (const e of liste) {
    const k = cle(e);
    const groupe = groupes.get(k);
    if (groupe) groupe.push(e);
    else groupes.set(k, [e]);
  }
  return groupes;
}

/** Index par identifiant : Map<id, élément>. */
export function indexerParId<T extends { id: string }>(liste: readonly T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const e of liste) index.set(e.id, e);
  return index;
}

const VIDE: readonly never[] = Object.freeze([]);

/** Éléments d'un groupe, ou une liste vide partagée (aucune allocation). */
export function groupe<K, T>(groupes: Map<K, T[]>, cle: K): readonly T[] {
  return groupes.get(cle) ?? VIDE;
}

/** Comparaison de libellés en français, avec un comparateur créé une seule fois. */
const COLLATEUR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
export const comparerLibelles = (a: string, b: string): number => COLLATEUR.compare(a, b);

/** Comparaison de dates ISO (AAAA-MM-JJ) : simple comparaison de chaînes, sans locale. */
export function comparerDates(a: string | null | undefined, b: string | null | undefined): number {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}
