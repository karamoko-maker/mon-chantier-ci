import { Injectable, computed, inject } from '@angular/core';
import { ajouterMois, moisCourant } from '../calculs/dates';
import {
  BesoinFinancement,
  calculerCalendrier,
  montantDisponible,
  moisPourAtteindre,
  resteAFinancer,
} from '../calculs/financement.calc';
import { arrondir, nombre } from '../calculs/montants';
import { comparerDates } from '../calculs/regroupement';
import { Financement, Id, ObjectifEpargne, RevenuExceptionnel } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';
import { BudgetService } from './budget.service';

export const ID_BESOIN_NON_AFFECTE = 'non-affecte';

export interface ObjectifEvalue {
  objectif: ObjectifEpargne;
  montant: number;
  /** Nombre de mois avant d'atteindre l'objectif (null = non atteint dans l'horizon). */
  mois: number | null;
  moisAtteinte: string | null;
  /** L'objectif est-il atteint à la date souhaitée ? (null si pas de date) */
  aTemps: boolean | null;
}

/** Épargne, revenus exceptionnels, objectifs et calendrier de financement. */
@Injectable({ providedIn: 'root' })
export class FinancementService {
  private readonly store = inject(ChantierStore);
  private readonly budget = inject(BudgetService);

  readonly financement = this.store.financement;
  readonly revenus = computed(() =>
    [...this.store.revenus()].sort((a, b) => comparerDates(a.datePrevue, b.datePrevue)),
  );
  readonly objectifs = this.store.objectifs;

  /** Montant disponible pour le chantier (aucun revenu futur inclus). */
  readonly disponible = computed(() => montantDisponible(this.financement()));

  readonly resteAFinancer = computed(() => {
    const s = this.budget.synthese();
    return resteAFinancer(s.totalReference, s.paye.total, this.disponible());
  });

  private readonly coefficientReserve = computed(() =>
    this.financement().inclureReserveDansBesoins ? 1 + nombre(this.budget.synthese().pourcentageReserve) / 100 : 1,
  );

  /** Besoins à financer dans l'ordre : éléments non répartis, puis phases non terminées. */
  readonly besoins = computed<BesoinFinancement[]>(() => {
    const s = this.budget.synthese();
    const k = this.coefficientReserve();
    const besoins: BesoinFinancement[] = [];
    const resteNonAffecte = Math.max(0, s.nonAffecte.estimatif - s.nonAffecte.paye);
    if (resteNonAffecte > 0) {
      besoins.push({
        id: ID_BESOIN_NON_AFFECTE,
        libelle: 'Estimation non encore répartie par phase',
        montant: arrondir(resteNonAffecte * k),
      });
    }
    for (const p of s.phases) {
      if (p.phase.statut === 'termine') continue;
      const reste = Math.max(0, p.reference - p.paye);
      if (reste > 0) {
        besoins.push({ id: p.phase.id, libelle: `${p.phase.ordre}. ${p.phase.nom}`, montant: arrondir(reste * k) });
      }
    }
    return besoins;
  });

  readonly calendrier = computed(() =>
    calculerCalendrier(this.financement(), this.store.revenus(), this.besoins()),
  );

  readonly objectifsEvalues = computed<ObjectifEvalue[]>(() => {
    const f = this.financement();
    const revenus = this.store.revenus();
    const besoins = this.besoins();
    const cal = this.calendrier();
    return this.objectifs().map((o) => {
      const selection = besoins.filter((b) => o.phaseIds.includes(b.id));
      const montant = o.montantManuel ?? arrondir(selection.reduce((s, b) => s + b.montant, 0));
      let mois: number | null;
      if (o.montantManuel === null && o.phaseIds.length > 0) {
        // Les phases sont financées dans l'ordre : l'objectif est atteint quand la dernière l'est.
        const indices = selection.map((b) => cal.moisParBesoin.get(b.id) ?? null);
        mois = selection.length === 0 ? 0 : indices.some((x) => x === null) ? null : Math.max(...(indices as number[]));
      } else {
        mois = moisPourAtteindre(montant, f, revenus);
      }
      const moisAtteinte = mois === null ? null : ajouterMois(f.moisDebut, mois);
      const moisSouhaite = o.dateSouhaitee ? o.dateSouhaitee.slice(0, 7) : null;
      return {
        objectif: o,
        montant,
        mois,
        moisAtteinte,
        aTemps: moisSouhaite === null ? null : moisAtteinte !== null && moisAtteinte <= moisSouhaite,
      };
    });
  });

  /** Mois (AAAA-MM) à partir duquel une phase est finançable (null = au-delà de l'horizon). */
  moisFinancable(phaseId: Id): string | null | undefined {
    const cal = this.calendrier();
    if (!cal.moisParBesoin.has(phaseId)) return undefined;
    const idx = cal.moisParBesoin.get(phaseId);
    return idx === null || idx === undefined ? null : ajouterMois(this.financement().moisDebut, idx);
  }

  mettreAJour(modifications: Partial<Financement>): void {
    this.store.mettreAJour((d) => ({ ...d, financement: { ...d.financement, ...modifications } }));
  }

  recalerSurMoisCourant(): void {
    this.mettreAJour({ moisDebut: moisCourant() });
  }

  ajouterRevenu(r: Omit<RevenuExceptionnel, 'id'>): Id {
    return this.store.ajouter('revenus', r);
  }
  modifierRevenu(id: Id, modifications: Partial<RevenuExceptionnel>): void {
    this.store.modifier('revenus', id, modifications);
  }
  supprimerRevenu(id: Id): void {
    this.store.supprimer('revenus', id);
  }

  ajouterObjectif(o: Omit<ObjectifEpargne, 'id'>): Id {
    return this.store.ajouter('objectifs', o);
  }
  modifierObjectif(id: Id, modifications: Partial<ObjectifEpargne>): void {
    this.store.modifier('objectifs', id, modifications);
  }
  supprimerObjectif(id: Id): void {
    this.store.supprimer('objectifs', id);
  }
}
