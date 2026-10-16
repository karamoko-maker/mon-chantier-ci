import { Injectable, computed, inject } from '@angular/core';
import {
  montantConvenuIntervention,
  recapitulerMainOeuvre,
  resteAPayerIntervention,
} from '../calculs/main-oeuvre.calc';
import { comparerDates, comparerLibelles } from '../calculs/regroupement';
import { EnveloppeMainOeuvre, Id, Intervention } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';
import { BudgetService } from './budget.service';
import { PhasesService } from './phases.service';

/** Ouvriers, prestataires, enveloppes de planification et récapitulatifs. */
@Injectable({ providedIn: 'root' })
export class MainOeuvreService {
  private readonly store = inject(ChantierStore);
  private readonly budget = inject(BudgetService);
  private readonly phases = inject(PhasesService);

  readonly interventions = computed(() =>
    [...this.store.interventions()]
      .sort((a, b) => comparerDates(b.date, a.date))
      .map((i) => ({
        intervention: i,
        convenu: montantConvenuIntervention(i),
        reste: resteAPayerIntervention(i),
      })),
  );
  readonly enveloppes = computed(() => this.budget.synthese().statutsEnveloppes);

  readonly recapParMetier = computed(() =>
    recapitulerMainOeuvre(
      this.store.interventions(),
      this.enveloppes(),
      (i) => i.metier,
      (e) => e.metier,
      (cle) => cle,
    ).sort((a, b) => comparerLibelles(a.libelle, b.libelle)),
  );

  readonly recapParPhase = computed(() => {
    const ordre = new Map(this.phases.phases().map((p) => [p.id, p.ordre]));
    return recapitulerMainOeuvre(
      this.store.interventions(),
      this.enveloppes(),
      (i) => i.phaseId ?? '',
      (e) => e.phaseId ?? '',
      (cle) => (cle ? this.phases.nom(cle) : 'Non affecté (tout le chantier)'),
    ).sort((a, b) => (ordre.get(a.cle) ?? 999) - (ordre.get(b.cle) ?? 999));
  });

  ajouterIntervention(i: Omit<Intervention, 'id'>): Id {
    return this.store.ajouter('interventions', i);
  }
  modifierIntervention(id: Id, modifications: Partial<Intervention>): void {
    this.store.modifier('interventions', id, modifications);
  }
  supprimerIntervention(id: Id): void {
    this.store.supprimer('interventions', id);
  }

  ajouterEnveloppe(e: Omit<EnveloppeMainOeuvre, 'id'>): Id {
    return this.store.ajouter('enveloppes', e);
  }
  modifierEnveloppe(id: Id, modifications: Partial<EnveloppeMainOeuvre>): void {
    this.store.modifier('enveloppes', id, modifications);
  }
  supprimerEnveloppe(id: Id): void {
    this.store.supprimer('enveloppes', id);
  }
}
