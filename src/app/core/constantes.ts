import {
  CategorieDepense,
  EtapeDepense,
  EtatEquipement,
  ModeAcquisition,
  OriginePrix,
  SourceQuantite,
  StatutPhase,
} from './models';

/** Version de l'application — modifiée à chaque évolution du code. */
export const APP_VERSION = '1.1.0';
export const APP_NOM = 'Mon Chantier CI';

export const MENTION_ESTIMATION = 'Estimation indicative — à valider par un professionnel';

export const METIERS: readonly string[] = [
  'Chef maçon',
  'Maçons',
  'Manœuvres',
  'Ferrailleurs',
  'Coffreurs',
  'Plombiers',
  'Électriciens',
  'Carreleurs',
  'Peintres',
  'Menuisiers',
  'Soudeurs',
  "Conducteurs d'engins",
];

export const LIBELLES_STATUT_PHASE: Record<StatutPhase, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
  bloque: 'Bloqué',
};

export const LIBELLES_TRANCHE: Record<number, string> = {
  1: 'Tranche 1 — Études et gros œuvre RDC + R+1',
  2: 'Tranche 2 — Gros œuvre R+2 et R+3',
  3: 'Tranche 3 — Second œuvre et finitions',
};

export const LIBELLES_CATEGORIE_DEPENSE: Record<CategorieDepense, string> = {
  transport: 'Transport et livraison',
  location: 'Location (camion, engins)',
  fonctionnement: 'Eau, électricité, gardiennage',
  etudes: 'Études techniques',
  administratif: 'Frais administratifs',
  imprevus: 'Imprévus',
  divers: 'Frais divers',
};

export const LIBELLES_ETAPE_DEPENSE: Record<EtapeDepense, string> = {
  prevue: 'Prévue',
  commandee: 'Commandée / engagée',
  facturee: 'Facturée',
};

export const LIBELLES_MODE_ACQUISITION: Record<ModeAcquisition, string> = {
  achete: 'Acheté',
  loue: 'Loué',
  disponible: 'Déjà disponible',
};

export const LIBELLES_ETAT_EQUIPEMENT: Record<EtatEquipement, string> = {
  neuf: 'Neuf',
  bon: 'Bon état',
  usage: 'Usagé',
  hors_service: 'Hors service',
};

export const LIBELLES_ORIGINE_PRIX: Record<OriginePrix, string> = {
  a_renseigner: 'Prix à renseigner',
  hypothese: 'Prix indicatif (hypothèse)',
  devis: 'Devis fournisseur',
  facture: 'Prix facturé',
};

export const LIBELLES_SOURCE_QUANTITE: Record<SourceQuantite, string> = {
  hypothese: 'Hypothèse de départ',
  metre_ingenieur: "Métré de l'ingénieur",
};

/** Modèles de dépenses proposés dans la section « Transport et frais annexes ». */
export const MODELES_FRAIS_ANNEXES: readonly { libelle: string; categorie: CategorieDepense }[] = [
  { libelle: 'Livraison du ciment', categorie: 'transport' },
  { libelle: 'Transport du sable', categorie: 'transport' },
  { libelle: 'Transport du gravier', categorie: 'transport' },
  { libelle: 'Transport du fer', categorie: 'transport' },
  { libelle: 'Livraison des parpaings', categorie: 'transport' },
  { libelle: "Location d'un camion", categorie: 'location' },
  { libelle: "Location d'engins", categorie: 'location' },
  { libelle: 'Eau et électricité du chantier', categorie: 'fonctionnement' },
  { libelle: 'Gardiennage', categorie: 'fonctionnement' },
  { libelle: 'Études techniques', categorie: 'etudes' },
  { libelle: 'Frais administratifs', categorie: 'administratif' },
  { libelle: 'Frais divers et imprévus', categorie: 'imprevus' },
];

/** Clés des postes budgétaires et leurs libellés. */
export type PosteBudget =
  | 'materiaux'
  | 'equipements'
  | 'mainOeuvre'
  | 'transport'
  | 'fraisAnnexes'
  | 'autres';

export const LIBELLES_POSTE: Record<PosteBudget | 'imprevus', string> = {
  materiaux: 'Matériaux',
  equipements: 'Équipements',
  mainOeuvre: "Main-d'œuvre",
  transport: 'Transport',
  fraisAnnexes: 'Frais annexes',
  autres: 'Autres coûts',
  imprevus: 'Imprévus',
};
