import { Routes } from '@angular/router';

/** Chaque rubrique est chargée à la demande (applications plus légère sur mobile). */
export const routes: Routes = [
  {
    path: '',
    title: 'Tableau de bord — Mon Chantier CI',
    loadComponent: () => import('./pages/tableau-de-bord/tableau-de-bord.component').then((m) => m.TableauDeBordComponent),
  },
  {
    path: 'projet',
    title: 'Mon projet — Mon Chantier CI',
    loadComponent: () => import('./pages/projet/projet.component').then((m) => m.ProjetComponent),
  },
  {
    path: 'phases',
    title: 'Phases de construction — Mon Chantier CI',
    loadComponent: () => import('./pages/phases/phases.component').then((m) => m.PhasesComponent),
  },
  {
    path: 'phases/:id',
    title: 'Détail de la phase — Mon Chantier CI',
    loadComponent: () => import('./pages/phases/phase-detail.component').then((m) => m.PhaseDetailComponent),
  },
  {
    path: 'materiaux',
    title: 'Matériaux — Mon Chantier CI',
    loadComponent: () => import('./pages/materiaux/materiaux.component').then((m) => m.MateriauxComponent),
  },
  {
    path: 'equipements',
    title: 'Équipements — Mon Chantier CI',
    loadComponent: () => import('./pages/equipements/equipements.component').then((m) => m.EquipementsComponent),
  },
  {
    path: 'main-oeuvre',
    title: "Main-d'œuvre — Mon Chantier CI",
    loadComponent: () => import('./pages/main-oeuvre/main-oeuvre.component').then((m) => m.MainOeuvreComponent),
  },
  {
    path: 'achats-stocks',
    title: 'Achats et stocks — Mon Chantier CI',
    loadComponent: () => import('./pages/achats-stocks/achats-stocks.component').then((m) => m.AchatsStocksComponent),
  },
  {
    path: 'depenses',
    title: 'Dépenses — Mon Chantier CI',
    loadComponent: () => import('./pages/depenses/depenses.component').then((m) => m.DepensesComponent),
  },
  {
    path: 'epargne',
    title: 'Épargne et financement — Mon Chantier CI',
    loadComponent: () => import('./pages/epargne/epargne.component').then((m) => m.EpargneComponent),
  },
  {
    path: 'rapports',
    title: 'Rapports — Mon Chantier CI',
    loadComponent: () => import('./pages/rapports/rapports.component').then((m) => m.RapportsComponent),
  },
  {
    path: 'parametres',
    title: 'Paramètres — Mon Chantier CI',
    loadComponent: () => import('./pages/parametres/parametres.component').then((m) => m.ParametresComponent),
  },
  { path: '**', redirectTo: '' },
];
