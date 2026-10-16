import { Injectable, computed, inject } from '@angular/core';
import { Parametres } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';

type ListeParametre = 'unites' | 'categoriesMateriaux' | 'modesPaiement';

/** Unités, catégories, modes de paiement et tarifs de main-d'œuvre de référence. */
@Injectable({ providedIn: 'root' })
export class ParametresService {
  private readonly store = inject(ChantierStore);
  readonly parametres = this.store.parametres;
  readonly unites = computed(() => this.parametres().unites);
  readonly categoriesMateriaux = computed(() => this.parametres().categoriesMateriaux);
  readonly modesPaiement = computed(() => this.parametres().modesPaiement);
  readonly tarifsMetiers = computed(() => this.parametres().tarifsMetiers);

  private modifier(modifications: Partial<Parametres>): void {
    this.store.mettreAJour((d) => ({ ...d, parametres: { ...d.parametres, ...modifications } }));
  }

  ajouterValeur(liste: ListeParametre, valeur: string): boolean {
    const v = valeur.trim();
    if (!v || this.parametres()[liste].some((x) => x.toLowerCase() === v.toLowerCase())) return false;
    this.modifier({ [liste]: [...this.parametres()[liste], v] });
    return true;
  }

  retirerValeur(liste: ListeParametre, valeur: string): void {
    this.modifier({ [liste]: this.parametres()[liste].filter((x) => x !== valeur) });
  }

  /** L'unité est-elle utilisée par un matériau ? */
  uniteUtilisee(unite: string): boolean {
    return this.store.materiaux().some((m) => m.unite === unite);
  }

  tarifDe(metier: string): number {
    return this.tarifsMetiers().find((t) => t.metier === metier)?.tarifJournalier ?? 0;
  }

  definirTarif(metier: string, tarifJournalier: number): void {
    const tarifs = this.tarifsMetiers();
    const existe = tarifs.some((t) => t.metier === metier);
    this.modifier({
      tarifsMetiers: existe
        ? tarifs.map((t) => (t.metier === metier ? { ...t, tarifJournalier } : t))
        : [...tarifs, { metier, tarifJournalier }],
    });
  }
}
