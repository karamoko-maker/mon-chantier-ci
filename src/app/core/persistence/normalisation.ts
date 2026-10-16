import { creerDonneesInitiales } from '../data/donnees-initiales';
import { ChantierData, CleCollection, VERSION_SCHEMA } from '../models';

const COLLECTIONS: CleCollection[] = [
  'phases', 'materiaux', 'estimation', 'achats', 'consommations', 'equipements',
  'interventions', 'enveloppes', 'depenses', 'revenus', 'objectifs',
];

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Valide et complète des données importées ou rechargées.
 * Les champs manquants (anciennes versions) reçoivent leurs valeurs par défaut.
 * Lève une erreur en français si le fichier n'est pas une sauvegarde Mon Chantier CI.
 */
export function normaliserDonnees(brut: unknown): ChantierData {
  if (!estObjet(brut) || !estObjet(brut['projet']) || !Array.isArray(brut['phases'])) {
    throw new Error("Ce fichier n'est pas une sauvegarde valide de Mon Chantier CI.");
  }
  const version = typeof brut['versionSchema'] === 'number' ? brut['versionSchema'] : 1;
  if (version > VERSION_SCHEMA) {
    throw new Error("Cette sauvegarde provient d'une version plus récente de l'application.");
  }
  const defaut = creerDonneesInitiales();
  const resultat = { ...defaut } as ChantierData;
  const r = resultat as unknown as Record<string, unknown>;

  for (const cle of COLLECTIONS) {
    const valeur = brut[cle];
    if (valeur !== undefined && !Array.isArray(valeur)) {
      throw new Error(`Sauvegarde invalide : la rubrique « ${cle} » est mal formée.`);
    }
    r[cle] = ((valeur as unknown[] | undefined) ?? []).map((el) => {
      if (!estObjet(el) || typeof el['id'] !== 'string') {
        throw new Error(`Sauvegarde invalide : un élément de « ${cle} » n'a pas d'identifiant.`);
      }
      return { ...completerDefauts(cle), ...el };
    });
  }
  resultat.projet = { ...defaut.projet, ...(brut['projet'] as object) };
  resultat.financement = { ...defaut.financement, ...(estObjet(brut['financement']) ? brut['financement'] : {}) };
  const parametres = estObjet(brut['parametres']) ? brut['parametres'] : {};
  resultat.parametres = { ...defaut.parametres, ...parametres };
  resultat.versionSchema = VERSION_SCHEMA;
  return resultat;
}

/** Valeurs par défaut des champs ajoutés au fil des versions (aucun pour la v1). */
function completerDefauts(cle: CleCollection): Record<string, unknown> {
  switch (cle) {
    case 'interventions':
      return { prestationsCouvertes: [], heuresSupplementaires: 0, tarifHoraireSup: 0, montantForfait: 0 };
    case 'estimation':
      return { inclureAuBudget: true, valide: false, source: 'hypothese', commentaire: '' };
    case 'objectifs':
      return { phaseIds: [], montantManuel: null, dateSouhaitee: null };
    default:
      return {};
  }
}
