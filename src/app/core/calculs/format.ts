import { nombre } from './montants';

const FORMAT_ENTIER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const FORMAT_DECIMAL = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Uniformise les espaces insécables produits par Intl (U+202F) en espace insécable classique. */
function espaces(texte: string): string {
  return texte.replace(/[\u202f\u00a0]/g, '\u00a0');
}

/** 1250000 → « 1 250 000 » */
export function formatNombre(valeur: number, decimales = false): string {
  return espaces((decimales ? FORMAT_DECIMAL : FORMAT_ENTIER).format(nombre(valeur)));
}

/** 1250000 → « 1 250 000 FCFA » */
export function formatFcfa(valeur: number): string {
  return `${formatNombre(Math.round(nombre(valeur)))}\u00a0FCFA`;
}

/** Format court pour les axes de graphiques : 1250000 → « 1,25 M ». */
export function formatCourt(valeur: number): string {
  const v = nombre(valeur);
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${formatNombre(v / 1_000_000, true)}\u00a0M`;
  if (abs >= 1_000) return `${formatNombre(v / 1_000, true)}\u00a0k`;
  return formatNombre(v);
}

/** « 2026-10-09 » → « 09/10/2026 » ; valeur vide → « — ». */
export function formatDate(date: string | null | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return '—';
  const [a, m, j] = date.slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
}

/** « 2026-10 » → « oct. 2026 » (ou « octobre 2026 » en format long). */
export function formatMois(mois: string | null | undefined, long = false): string {
  if (!mois || !/^\d{4}-\d{2}/.test(mois)) return '—';
  const [a, m] = mois.split('-').map(Number);
  return `${(long ? MOIS_LONG : MOIS)[m - 1]} ${a}`;
}

/** Pourcentage arrondi : 42.4 → « 42 % ». */
export function formatPourcent(valeur: number): string {
  return `${formatNombre(Math.round(nombre(valeur)))}\u00a0%`;
}
