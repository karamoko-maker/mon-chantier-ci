import { Injectable, computed, inject } from '@angular/core';
import { indexerParId } from '../calculs/regroupement';
import { Id, Phase } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';

/** Gestion des phases de construction. */
@Injectable({ providedIn: 'root' })
export class PhasesService {
  private readonly store = inject(ChantierStore);
  readonly phases = computed(() => [...this.store.phases()].sort((a, b) => a.ordre - b.ordre));
  private readonly index = computed(() => indexerParId(this.store.phases()));
  /** Libellés « N. Nom » préparés une fois : les tableaux les affichent sans recherche. */
  private readonly libelles = computed(() => new Map(this.store.phases().map((p) => [p.id, `${p.ordre}. ${p.nom}`])));

  parId(id: Id | null | undefined): Phase | undefined {
    return id ? this.index().get(id) : undefined;
  }

  nom(id: Id | null | undefined): string {
    if (!id) return 'Non affecté';
    return this.libelles().get(id) ?? 'Phase supprimée';
  }

  ajouter(phase: Omit<Phase, 'id'>): Id {
    return this.store.ajouter('phases', phase);
  }

  modifier(id: Id, modifications: Partial<Phase>): void {
    this.store.modifier('phases', id, modifications);
  }

  /** Nombre d'éléments rattachés à une phase (pour avertir avant suppression). */
  elementsRattaches(id: Id): number {
    const d = this.store.data();
    return [d.estimation, d.achats, d.consommations, d.equipements, d.interventions, d.enveloppes, d.depenses]
      .reduce((n, liste) => n + liste.filter((e: { phaseId: Id | null }) => e.phaseId === id).length, 0);
  }

  /** Supprime une phase ; les éléments rattachés deviennent « non affectés » (rien n'est perdu). */
  supprimer(id: Id): void {
    const detacher = <T extends { phaseId: Id | null }>(liste: T[]): T[] =>
      liste.some((e) => e.phaseId === id) ? liste.map((e) => (e.phaseId === id ? { ...e, phaseId: null } : e)) : liste;
    this.store.mettreAJour((d) => ({
      ...d,
      phases: d.phases.filter((p) => p.id !== id),
      estimation: detacher(d.estimation),
      achats: detacher(d.achats),
      consommations: detacher(d.consommations),
      equipements: detacher(d.equipements),
      interventions: detacher(d.interventions),
      enveloppes: detacher(d.enveloppes),
      depenses: detacher(d.depenses),
      objectifs: d.objectifs.map((o) => ({ ...o, phaseIds: o.phaseIds.filter((p) => p !== id) })),
    }));
  }

  prochainOrdre(): number {
    return this.store.phases().reduce((max, p) => Math.max(max, p.ordre), 0) + 1;
  }
}
