/**
 * Génération de fichiers CSV compatibles Excel (version française) :
 * séparateur « ; », virgule décimale, encodage UTF-8 avec BOM.
 */
export type ValeurCsv = string | number | boolean | null | undefined;

function cellule(v: ValeurCsv): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : '';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  const texte = String(v).replace(/[\u202f\u00a0]/g, ' ');
  return /[;"\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export function versCsv(entetes: readonly ValeurCsv[], lignes: readonly (readonly ValeurCsv[])[]): string {
  return [entetes, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n');
}

/** Déclenche le téléchargement d'un fichier texte dans le navigateur. */
export function telechargerFichier(nom: string, contenu: string | Blob, type = 'text/plain'): void {
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function telechargerCsv(nom: string, entetes: readonly ValeurCsv[], lignes: readonly (readonly ValeurCsv[])[]): void {
  telechargerFichier(nom, '\ufeff' + versCsv(entetes, lignes), 'text/csv;charset=utf-8');
}
