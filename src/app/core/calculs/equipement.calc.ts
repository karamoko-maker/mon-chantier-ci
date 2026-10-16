import { Equipement } from '../models';
import { arrondir, nombre } from './montants';

/**
 * Coût d'un équipement, compté une seule fois dans sa phase d'acquisition :
 * - acheté : quantité × prix d'achat unitaire ;
 * - loué : quantité × coût de location journalier × durée (jours) ;
 * - déjà disponible : 0.
 */
export function coutEquipement(e: Omit<Equipement, 'id'>): number {
  switch (e.mode) {
    case 'achete':
      return arrondir(nombre(e.quantite) * nombre(e.prixAchatUnitaire));
    case 'loue':
      return arrondir(nombre(e.quantite) * nombre(e.coutLocationJournalier) * nombre(e.dureeLocationJours));
    default:
      return 0;
  }
}
