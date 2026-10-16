import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';

/** Formulaire réactif dont on peut lire toutes les valeurs (champs désactivés compris). */
interface FormulaireLisible<V> {
  getRawValue(): V;
  valueChanges: Observable<unknown>;
}

/**
 * Valeurs d'un formulaire réactif sous forme de signal.
 * Les aperçus de calcul (montant, solde, écart…) deviennent des `computed` :
 * ils ne sont recalculés que lorsqu'un champ change, et non à chaque rafraîchissement de l'écran.
 * À appeler dans le contexte d'injection (initialiseur de propriété d'un composant).
 */
export function signalFormulaire<V>(form: FormulaireLisible<V>): Signal<V> {
  return toSignal(form.valueChanges.pipe(map(() => form.getRawValue())), { initialValue: form.getRawValue() });
}

/** Valeur texte du champ qui a déclenché l'événement (filtres, saisies en ligne). */
export function valeurChamp(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
