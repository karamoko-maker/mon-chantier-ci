import { Injectable, computed, inject } from '@angular/core';
import { aujourdhuiISO } from '../calculs/dates';
import { montantLigne } from '../calculs/montants';
import { comparerLibelles, indexerParId } from '../calculs/regroupement';
import { Id, LigneEstimation, Materiau } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';

export interface LigneEstimationCalculee {
  ligne: LigneEstimation;
  materiau: Materiau | undefined;
  montant: number;
}

/** Catalogue des matériaux et estimation des besoins. */
@Injectable({ providedIn: 'root' })
export class MateriauxService {
  private readonly store = inject(ChantierStore);
  readonly materiaux = computed(() =>
    [...this.store.materiaux()].sort(
      (a, b) => comparerLibelles(a.categorie, b.categorie) || comparerLibelles(a.nom, b.nom),
    ),
  );
  readonly parId = computed(() => indexerParId(this.store.materiaux()));
  readonly lignes = computed<LigneEstimationCalculee[]>(() => {
    const parId = this.parId();
    return this.store.estimation().map((ligne) => {
      const materiau = parId.get(ligne.materiauId);
      return { ligne, materiau, montant: montantLigne(ligne.quantite, materiau?.prixUnitaire ?? 0) };
    });
  });

  ajouter(m: Omit<Materiau, 'id'>): Id {
    return this.store.ajouter('materiaux', m);
  }

  modifier(id: Id, modifications: Partial<Materiau>): void {
    const actuel = this.parId().get(id);
    const prixChange =
      modifications.prixUnitaire !== undefined && actuel && modifications.prixUnitaire !== actuel.prixUnitaire;
    this.store.modifier('materiaux', id, {
      ...modifications,
      ...(prixChange && !modifications.dateMajPrix ? { dateMajPrix: aujourdhuiISO() } : {}),
    });
  }

  /** Mise à jour rapide du prix (date de mise à jour automatique). Ne fait rien si le prix est inchangé. */
  modifierPrix(id: Id, prixUnitaire: number): boolean {
    const m = this.parId().get(id);
    if (!m || m.prixUnitaire === prixUnitaire) return false;
    this.store.modifier('materiaux', id, {
      prixUnitaire,
      dateMajPrix: aujourdhuiISO(),
      originePrix: m.originePrix === 'a_renseigner' && prixUnitaire > 0 ? 'hypothese' : m.originePrix,
    });
    return true;
  }

  /** Un matériau utilisé dans des achats ou des sorties de stock ne peut pas être supprimé. */
  estUtiliseDansLesAchats(id: Id): boolean {
    return this.store.achats().some((a) => a.materiauId === id) || this.store.consommations().some((c) => c.materiauId === id);
  }

  nombreLignes(id: Id): number {
    return this.store.estimation().filter((l) => l.materiauId === id).length;
  }

  /** Supprime le matériau et ses lignes d'estimation. */
  supprimer(id: Id): boolean {
    if (this.estUtiliseDansLesAchats(id)) return false;
    this.store.mettreAJour((d) => ({
      ...d,
      materiaux: d.materiaux.filter((m) => m.id !== id),
      estimation: d.estimation.filter((l) => l.materiauId !== id),
    }));
    return true;
  }

  ajouterLigne(l: Omit<LigneEstimation, 'id'>): Id {
    return this.store.ajouter('estimation', l);
  }

  modifierLigne(id: Id, modifications: Partial<LigneEstimation>): void {
    this.store.modifier('estimation', id, modifications);
  }

  supprimerLigne(id: Id): void {
    this.store.supprimer('estimation', id);
  }

  /** Marque toutes les lignes comme validées par le professionnel. */
  validerToutesLesLignes(): void {
    this.store.mettreAJour((d) => ({
      ...d,
      estimation: d.estimation.map((l) => ({ ...l, valide: true, source: 'metre_ingenieur' })),
    }));
  }
}
