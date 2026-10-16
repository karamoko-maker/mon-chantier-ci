import { DateISO, MoisISO } from '../models';

/** Date du jour au format AAAA-MM-JJ (heure locale). */
export function aujourdhuiISO(date = new Date()): DateISO {
  const a = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

/** Mois courant au format AAAA-MM. */
export function moisCourant(date = new Date()): MoisISO {
  return aujourdhuiISO(date).slice(0, 7);
}

/** Mois (AAAA-MM) d'une date ISO. */
export function moisDe(date: DateISO): MoisISO {
  return date.slice(0, 7);
}

/** Nombre de mois entre deux mois AAAA-MM (b − a). */
export function ecartMois(a: MoisISO, b: MoisISO): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** Ajoute n mois à un mois AAAA-MM. */
export function ajouterMois(mois: MoisISO, n: number): MoisISO {
  const [y, m] = mois.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** Vérifie le format AAAA-MM-JJ. */
export function estDateISO(valeur: unknown): valeur is DateISO {
  return typeof valeur === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valeur);
}
