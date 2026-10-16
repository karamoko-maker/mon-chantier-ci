import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/** Message de validation d'un champ de formulaire réactif. */
@Component({
  selector: 'app-erreur-champ',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (controle().invalid && (controle().touched || controle().dirty)) {
      <span class="erreur-champ">{{ message() }}</span>
    }
  `,
})
export class ErreurChampComponent {
  readonly controle = input.required<AbstractControl>();

  message(): string {
    const e = this.controle().errors ?? {};
    if (e['required']) return 'Ce champ est obligatoire.';
    if (e['min']) return `La valeur doit être supérieure ou égale à ${e['min'].min}.`;
    if (e['max']) return `La valeur doit être inférieure ou égale à ${e['max'].max}.`;
    if (e['maxlength']) return `Texte trop long (${e['maxlength'].requiredLength} caractères maximum).`;
    if (e['stockInsuffisant']) return `Stock insuffisant : ${e['stockInsuffisant'].disponible} disponible(s).`;
    if (e['plage']) return e['plage'];
    return 'Valeur invalide.';
  }
}
