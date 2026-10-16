# Mon Chantier CI — v1.1.0

Application web Angular pour **planifier, estimer, budgétiser et suivre** la construction d'un immeuble résidentiel
R+3 à Abidjan (Côte d'Ivoire). Interface entièrement en français, montants en FCFA, dates au format JJ/MM/AAAA,
utilisable sur ordinateur, tablette et smartphone.

> **Estimation indicative — à valider par un professionnel.** L'application chiffre les quantités que vous saisissez.
> Elle ne fait aucun dimensionnement structurel (béton, fer, fondations) et ne remplace pas l'ingénieur.

---

## 1. Installation

Prérequis :

- **Node.js 22.12 ou plus récent** (ou Node 20.19+, ou Node 24) — https://nodejs.org
- npm (fourni avec Node.js)

```bash
cd mon-chantier-ci
npm install
```

## 2. Lancer le projet

```bash
npm start            # serveur de développement sur http://localhost:4200
```

Pour l'ouvrir depuis un téléphone sur le même réseau Wi-Fi :

```bash
npx ng serve --host 0.0.0.0     # puis http://<adresse-IP-du-PC>:4200 sur le téléphone
```

## 3. Tests

```bash
npm run test:ci      # exécute les 57 tests (formules de calcul, store, regroupements) avec Vitest
npm test             # mode surveillance pendant le développement
```

Les tests couvrent : Montant = Quantité × Prix unitaire, écart budgétaire, reste à payer, réserve pour imprévus,
coût de main-d'œuvre, contrôle des doubles comptages (forfaits / enveloppes / équipements), stocks
(commandé / reçu / consommé / disponible), distinction engagé / payé, budget validé, financement
(aucun revenu futur compté comme disponible), calendrier de financement, import des sauvegardes JSON,
et le sous-total initial de **4 860 000 FCFA**.

## 4. Version de production

```bash
npm run build        # résultat dans dist/mon-chantier-ci/browser/
```

Le dossier `dist/mon-chantier-ci/browser/` est un site statique : copiez-le sur n'importe quel hébergement
(Netlify, Vercel, GitHub Pages, serveur Apache/Nginx, clé USB servie par un petit serveur…).
Le routage utilise le « # » (`/#/phases`) : aucune règle de réécriture serveur n'est nécessaire.

Pour tester la version de production en local :

```bash
npx http-server dist/mon-chantier-ci/browser -p 8080
```

## 5. Architecture

```
src/
├── index.html, main.ts, styles.css        Point d'entrée, styles globaux (thème, tableaux, formulaires, impression)
└── app/
    ├── app.ts / app.config.ts / app.routes.ts   Coquille, fournisseurs (locale fr, stockage), routes chargées à la demande
    ├── core/
    │   ├── models/          Interfaces TypeScript : Projet, Phase, Materiau, LigneEstimation, Achat, Consommation,
    │   │                    Equipement, Intervention, EnveloppeMainOeuvre, Depense, Financement, RevenuExceptionnel,
    │   │                    ObjectifEpargne, Parametres, ChantierData (racine sauvegardée)
    │   ├── calculs/         TOUTES les formules (fonctions pures, testées) :
    │   │   ├── montants.ts            montant de ligne, écart, reste à payer, réserve
    │   │   ├── budget.calc.ts         synthèse : estimatif, validé, engagé, payé, par phase et par poste
    │   │   ├── main-oeuvre.calc.ts    coût, enveloppes, contrôle des doubles comptages
    │   │   ├── stock.calc.ts          commandé / reçu / consommé / disponible, alertes
    │   │   ├── equipement.calc.ts     coût compté une seule fois (achat ou location)
    │   │   ├── mouvements.calc.ts     vue consolidée des engagements et paiements
    │   │   ├── financement.calc.ts    disponible, reste à financer, mois pour un objectif, calendrier
    │   │   ├── controles.calc.ts      alertes de cohérence
    │   │   ├── format.ts, dates.ts, csv.ts, identifiant.ts
    │   │   └── *.spec.ts              tests
    │   ├── data/donnees-initiales.ts  hypothèses de départ modifiables (22 phases, catalogue, estimation, enveloppes)
    │   ├── persistence/
    │   │   ├── stockage.adapter.ts    contrat de stockage (abstrait)
    │   │   ├── local-storage.adapter.ts  implémentation v1 (navigateur)
    │   │   ├── chantier-store.service.ts source unique de vérité + sauvegarde automatique
    │   │   └── normalisation.ts       validation/migration des données importées
    │   └── services/        Un service par domaine : projet, phases, matériaux, équipements, main-d'œuvre,
    │                        achats-stocks, dépenses, financement, budget, contrôles, rapports, paramètres,
    │                        notifications, confirmation
    ├── layout/menu-lateral.component.ts
    ├── shared/              Composants réutilisables (carte-stat, bandeau, graphique Chart.js, progression,
    │                        dialogue de confirmation, notifications, erreur de champ) et pipes (fcfa, dateFr, mois…)
    └── pages/               Une page par rubrique du menu (composants autonomes + formulaires réactifs)
```

Principes :

- **Composants autonomes (standalone)**, détection de changements sans zone.js, **signaux** Angular.
- **Formulaires réactifs** avec validation et messages d'erreur en français.
- **Aucun montant calculé dans les composants** : tout passe par `core/calculs` → calculs dynamiques et cohérents.
- **Pas de données dupliquées** : le prix d'une ligne d'estimation vient toujours du catalogue ; un paiement n'est saisi
  qu'à un seul endroit (achat, intervention, équipement ou dépense) et la vue « Tous les paiements » les consolide.
- **Performance** : les calculs parcourent chaque collection une seule fois (`core/calculs/regroupement.ts`) ;
  le store expose une tranche de signal par collection, si bien qu'une saisie ne relance que les calculs qui en
  dépendent ; tous les écrans sont en `OnPush`.
- **Les cinq niveaux de budget** sont distingués : estimatif initial, validé après étude, engagé, payé, reste à financer.

### Passer à une API + PostgreSQL

1. Créer `ApiStockageAdapter extends StockageAdapter` (appels HTTP `GET/PUT /api/chantiers/:id`).
2. Dans `app.config.ts`, remplacer `useClass: LocalStorageAdapter` par `useClass: ApiStockageAdapter` et ajouter `provideHttpClient()`.
3. Côté serveur, chaque collection de `ChantierData` correspond à une table (voir `docs/ARCHITECTURE.md`).

## 6. Documentation

- `docs/GUIDE-UTILISATEUR.md` — guide pas à pas en français
- `docs/ARCHITECTURE.md` — modèle de données, règles de calcul, schéma PostgreSQL proposé
- `docs/AMELIORATIONS.md` — pistes pour les prochaines versions
- `CHANGELOG.md` — historique des versions

## 7. Technologies

Angular 21 (TypeScript, composants autonomes, formulaires réactifs) · Chart.js 4 · jsPDF + jsPDF-AutoTable (export PDF,
chargés à la demande) · Vitest · localStorage.
