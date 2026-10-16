import { METIERS } from '../constantes';
import { aujourdhuiISO, moisCourant } from '../calculs/dates';
import {
  ChantierData,
  EnveloppeMainOeuvre,
  Equipement,
  LigneEstimation,
  Materiau,
  Phase,
  Tranche,
  VERSION_SCHEMA,
} from '../models';

/**
 * DONNÉES INITIALES — hypothèses de départ, toutes modifiables.
 *
 * Aucune quantité structurelle n'est calculée : les quantités ci-dessous sont celles de
 * l'estimation fournie par le propriétaire et doivent être remplacées par le métré de l'ingénieur.
 * Les matériaux sans prix fourni sont marqués « Prix à renseigner » (prix = 0) plutôt que
 * d'inventer un tarif.
 */

const PHASES: readonly [string, string, Tranche][] = [
  ['Études techniques, étude de sol et plans', 'Tout le bâtiment', 1],
  ['Installation et préparation du chantier', 'Terrain', 1],
  ['Terrassement', 'Terrain', 1],
  ['Fondations dimensionnées pour le bâtiment final R+3', 'Fondations', 1],
  ['Soubassement et dallage du rez-de-chaussée', 'RDC', 1],
  ['Poteaux, poutres et structures porteuses du rez-de-chaussée', 'RDC', 1],
  ['Dalle du premier étage', 'R+1', 1],
  ['Élévation des murs du premier étage', 'R+1', 1],
  ['Poteaux, poutres et dalle du deuxième étage', 'R+2', 2],
  ['Élévation des murs du deuxième étage', 'R+2', 2],
  ['Poteaux, poutres et dalle du troisième étage', 'R+3', 2],
  ['Élévation des murs du troisième étage', 'R+3', 2],
  ['Escalier et circulations', 'Tout le bâtiment', 3],
  ['Plomberie et évacuations', 'Tout le bâtiment', 3],
  ['Installation électrique', 'Tout le bâtiment', 3],
  ['Enduits et chapes', 'Tout le bâtiment', 3],
  ['Étanchéité', 'Toiture-terrasse', 3],
  ['Carrelage et revêtements', 'Tout le bâtiment', 3],
  ['Portes et fenêtres', 'Tout le bâtiment', 3],
  ['Peinture et finitions', 'Tout le bâtiment', 3],
  ['Équipements sanitaires et cuisine', 'Logements', 3],
  ['Contrôles, réception et fin de chantier', 'Tout le bâtiment', 3],
];

export function identifiantPhase(ordre: number): string {
  return `phase-${String(ordre).padStart(2, '0')}`;
}

function creerPhases(): Phase[] {
  return PHASES.map(([nom, niveau, tranche], i) => ({
    id: identifiantPhase(i + 1),
    ordre: i + 1,
    nom,
    niveau,
    tranche,
    dateDebut: null,
    dateFin: null,
    statut: 'a_faire',
    avancement: 0,
    budgetValide: null,
    autresCouts: 0,
    observations:
      i === 3
        ? "Les fondations doivent être dimensionnées par l'ingénieur pour supporter le bâtiment final R+3, même si les étages sont construits plus tard."
        : '',
  }));
}

function materiau(
  id: string,
  nom: string,
  categorie: string,
  unite: string,
  prixUnitaire: number,
  options: Partial<Materiau> = {},
  dateRef: string,
): Materiau {
  return {
    id,
    nom,
    categorie,
    unite,
    prixUnitaire,
    originePrix: prixUnitaire > 0 ? 'hypothese' : 'a_renseigner',
    fournisseur: '',
    dateMajPrix: prixUnitaire > 0 ? dateRef : null,
    seuilAlerte: 0,
    structurel: false,
    notes: '',
    ...options,
  };
}

function creerMateriaux(dateRef: string): Materiau[] {
  const NOTE_STRUCT = "Quantités à reprendre des plans d'exécution et du métré validé par l'ingénieur.";
  return [
    materiau('mat-ciment', 'Ciment (sac de 50 kg)', 'Liants', 'sac', 5000, { structurel: true, seuilAlerte: 20, notes: NOTE_STRUCT }, dateRef),
    materiau('mat-sable', 'Sable de construction', 'Granulats', 'm³', 12000, { structurel: true, seuilAlerte: 3, notes: NOTE_STRUCT }, dateRef),
    materiau('mat-sable-lave', 'Sable lavé', 'Granulats', 'm³', 0, { structurel: true, notes: NOTE_STRUCT }, dateRef),
    materiau('mat-gravier', 'Gravier concassé', 'Granulats', 'm³', 18000, { structurel: true, seuilAlerte: 2, notes: NOTE_STRUCT }, dateRef),
    materiau('mat-fer', 'Fer à béton', 'Aciers', 'tonne', 650000, {
      structurel: true,
      notes: "Diamètres et quantités selon les plans de ferraillage de l'ingénieur. Ne pas déduire de ratios.",
    }, dateRef),
    materiau('mat-fil', 'Fil de ligature', 'Aciers', 'rouleau', 10000, { seuilAlerte: 1 }, dateRef),
    materiau('mat-parpaing-10', 'Parpaings de 10 cm', 'Maçonnerie', 'unité', 0, {}, dateRef),
    materiau('mat-parpaing-15', 'Parpaings de 15 cm', 'Maçonnerie', 'unité', 350, { seuilAlerte: 100 }, dateRef),
    materiau('mat-parpaing-20', 'Parpaings de 20 cm', 'Maçonnerie', 'unité', 0, {}, dateRef),
    materiau('mat-bois-coffrage', 'Bois de coffrage', 'Coffrage', 'unité', 0, {}, dateRef),
    materiau('mat-planches', 'Planches', 'Coffrage', 'unité', 0, {}, dateRef),
    materiau('mat-pointes', 'Pointes', 'Coffrage', 'kg', 0, {}, dateRef),
    materiau('mat-forfait-coffrage', 'Bois de coffrage et pointes (forfait)', 'Coffrage', 'forfait', 400000, {
      notes: 'Forfait de départ. Si vous détaillez bois, planches et pointes, excluez ce forfait du budget.',
    }, dateRef),
    materiau('mat-etais', 'Étais', 'Coffrage', 'unité', 0, {
      notes: "Peut aussi être loué : voir le module Équipements (ne pas compter deux fois).",
    }, dateRef),
    materiau('mat-remblai', 'Remblai sélectionné', 'Terrassement', 'm³', 10000, {}, dateRef),
    materiau('mat-bpe', "Béton prêt à l'emploi", 'Béton', 'm³', 0, {
      structurel: true,
      notes: "Uniquement si nécessaire. Volumes selon le métré de l'ingénieur.",
    }, dateRef),
    materiau('mat-gaines', 'Gaines électriques', 'Électricité', 'rouleau', 0, {}, dateRef),
    materiau('mat-cables', 'Câbles électriques', 'Électricité', 'rouleau', 0, {}, dateRef),
    materiau('mat-tuyaux', 'Tuyaux de plomberie', 'Plomberie', 'mètre linéaire', 0, {}, dateRef),
    materiau('mat-finitions', 'Colles, enduits et matériaux de finition', 'Finitions', 'sac', 0, {}, dateRef),
    materiau('mat-materiel', 'Matériel de chantier (lot)', 'Matériel de chantier', 'lot', 200000, {
      notes: "Lot de départ. Si vous détaillez l'inventaire dans le module Équipements avec des prix, excluez ce lot.",
    }, dateRef),
  ];
}

function ligne(id: string, materiauId: string, quantite: number): LigneEstimation {
  return {
    id,
    materiauId,
    phaseId: null,
    quantite,
    source: 'hypothese',
    valide: false,
    inclureAuBudget: true,
    commentaire: 'Hypothèse de départ du propriétaire — à remplacer par le métré.',
  };
}

/** Estimation initiale : sous-total arithmétique de 4 860 000 FCFA. */
function creerEstimation(): LigneEstimation[] {
  return [
    ligne('est-ciment', 'mat-ciment', 250),
    ligne('est-sable', 'mat-sable', 25),
    ligne('est-gravier', 'mat-gravier', 20),
    ligne('est-fer', 'mat-fer', 2.5),
    ligne('est-fil', 'mat-fil', 5),
    ligne('est-parpaing-15', 'mat-parpaing-15', 1500),
    ligne('est-coffrage', 'mat-forfait-coffrage', 1),
    ligne('est-remblai', 'mat-remblai', 15),
    ligne('est-materiel', 'mat-materiel', 1),
  ];
}

function creerEquipements(): Equipement[] {
  const liste: [string, Equipement['mode']][] = [
    ['Brouettes', 'achete'],
    ['Pelles', 'achete'],
    ['Pioches', 'achete'],
    ['Seaux', 'achete'],
    ['Truelles', 'achete'],
    ['Taloche', 'achete'],
    ['Niveau à bulle', 'achete'],
    ['Mètre ruban', 'achete'],
    ['Fil à plomb', 'achete'],
    ['Cordeau', 'achete'],
    ['Équipements de protection individuelle', 'achete'],
    ['Échafaudages', 'loue'],
    ['Matériel de coffrage', 'loue'],
    ['Étais', 'loue'],
  ];
  return liste.map(([nom, mode], i) => ({
    id: `eq-${String(i + 1).padStart(2, '0')}`,
    nom,
    mode,
    quantite: 1,
    prixAchatUnitaire: 0,
    coutLocationJournalier: 0,
    dureeLocationJours: 0,
    etat: 'neuf',
    dateAcquisition: null,
    fournisseur: '',
    phaseId: identifiantPhase(2),
    montantPaye: 0,
    notes: 'Quantité et prix à renseigner. Tant que les prix sont à 0, le coût est couvert par le lot « Matériel de chantier ».',
  }));
}

function creerEnveloppes(): EnveloppeMainOeuvre[] {
  const liste: [string, number, number][] = [
    ['Chef maçon', 200000, 300000],
    ['Maçons', 300000, 600000],
    ['Manœuvres', 200000, 400000],
    ['Ferrailleurs', 200000, 350000],
    ['Coffreurs', 200000, 350000],
  ];
  return liste.map(([metier, min, max], i) => ({
    id: `env-${i + 1}`,
    metier,
    montantMin: min,
    montantMax: max,
    montantRetenu: Math.round((min + max) / 2),
    phaseId: null,
    inclureAuBudget: true,
  }));
}

export function creerDonneesInitiales(dateRef = aujourdhuiISO()): ChantierData {
  return {
    versionSchema: VERSION_SCHEMA,
    projet: {
      nom: 'Immeuble R+3 — Abidjan',
      pays: "Côte d'Ivoire",
      ville: 'Abidjan',
      commune: '',
      devise: 'XOF',
      surfaceTerrain: 114,
      surfaceConstructible: null,
      surfaceConstruiteEstimee: null,
      typeBatiment: 'Immeuble résidentiel R+3',
      nombreEtages: 3,
      styleArchitectural: "Moderne à l'ivoirienne",
      configurationLogements: 'Appartements de 2 chambres + salon',
      nombreLogements: null,
      dateDebutPrevue: null,
      pourcentageReserve: 10,
      metreValide: false,
      metreValidePar: '',
      metreValideLe: null,
      descriptif:
        'Construction progressive : fondations, rez-de-chaussée, puis premier, deuxième et troisième étages. ' +
        'Objectif : maîtriser les dépenses, acheter les matériaux progressivement, planifier la main-d’œuvre et suivre l’avancement.',
    },
    phases: creerPhases(),
    materiaux: creerMateriaux(dateRef),
    estimation: creerEstimation(),
    achats: [],
    consommations: [],
    equipements: creerEquipements(),
    interventions: [],
    enveloppes: creerEnveloppes(),
    depenses: [],
    financement: {
      epargneActuelle: 0,
      capaciteMensuelle: 0,
      reservePersonnelle: 0,
      moisDebut: moisCourant(new Date(dateRef + 'T12:00:00')),
      horizonMois: 36,
      inclureReserveDansBesoins: true,
    },
    revenus: [],
    objectifs: [],
    parametres: {
      unites: ['sac', 'tonne', 'kg', 'm³', 'm²', 'unité', 'rouleau', 'mètre linéaire', 'forfait', 'lot'],
      categoriesMateriaux: [
        'Liants', 'Granulats', 'Aciers', 'Maçonnerie', 'Coffrage', 'Terrassement', 'Béton',
        'Électricité', 'Plomberie', 'Finitions', 'Matériel de chantier',
      ],
      tarifsMetiers: METIERS.map((metier) => ({ metier, tarifJournalier: 0 })),
      modesPaiement: ['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque'],
    },
  };
}
