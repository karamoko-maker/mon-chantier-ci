import { Pipe, PipeTransform } from '@angular/core';
import { formatDate, formatFcfa, formatMois, formatNombre, formatPourcent } from '../../core/calculs/format';

/** {{ 1250000 | fcfa }} → « 1 250 000 FCFA » */
@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(valeur: number | null | undefined): string {
    return valeur === null || valeur === undefined ? '—' : formatFcfa(valeur);
  }
}

/** {{ 2.5 | nombre }} → « 2,5 » */
@Pipe({ name: 'nombre' })
export class NombrePipe implements PipeTransform {
  transform(valeur: number | null | undefined): string {
    return valeur === null || valeur === undefined ? '—' : formatNombre(valeur, true);
  }
}

/** {{ '2026-10-09' | dateFr }} → « 09/10/2026 » */
@Pipe({ name: 'dateFr' })
export class DateFrPipe implements PipeTransform {
  transform(valeur: string | null | undefined): string {
    return formatDate(valeur);
  }
}

/** {{ '2026-10' | mois }} → « oct. 2026 » */
@Pipe({ name: 'mois' })
export class MoisPipe implements PipeTransform {
  transform(valeur: string | null | undefined, long = false): string {
    return formatMois(valeur, long);
  }
}

/** {{ 42.3 | pourcent }} → « 42 % » */
@Pipe({ name: 'pourcent' })
export class PourcentPipe implements PipeTransform {
  transform(valeur: number | null | undefined): string {
    return formatPourcent(valeur ?? 0);
  }
}

export const PIPES_FORMAT = [FcfaPipe, NombrePipe, DateFrPipe, MoisPipe, PourcentPipe] as const;
