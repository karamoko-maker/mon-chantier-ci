# Architecture — Mon Chantier CI v1.1.0

## 1. Flux de données

```
Pages (composants autonomes, formulaires réactifs)
   │  lisent des signaux calculés / appellent des méthodes
   ▼
Services de domaine (projet, phases, matériaux, équipements, main-d'œuvre,
achats-stocks, dépenses, financement, budget, contrôles, rapports, paramètres)
   │  délèguent toutes les formules à core/calculs (fonctions pures)
   ▼
ChantierStore (source unique de vérité : signal<ChantierData>)
   │  sauvegarde automatique (300 ms après la dernière modification)
   ▼
StockageAdapter (abstrait)  ──►  LocalStorageAdapter (v1)  │  ApiStockageAdapter (futur)
```

Toute modification produit un nouvel objet `ChantierData` (mises à jour immuables). Les signaux `computed`
(synthèse budgétaire, stocks, alertes, calendrier) se recalculent automatiquement : changer une quantité ou un prix
met à jour instantanément montants, sous-totaux, budgets de phase, tableau de bord et rapports.

### Performance (v1.1.0)

- `ChantierStore` expose une tranche par collection (`phases()`, `achats()`…) et `donneesBudget()`. Une mise à jour ne
  remplace que la collection modifiée ; les calculs qui ne la lisent pas ne sont pas relancés.
- Une modification qui ne change aucune valeur est ignorée (ni recalcul ni sauvegarde).
- `calculerSynthese`, `calculerStocks` et `genererAlertes` ont une complexité linéaire : regroupement par phase ou par
  matériau en une passe (`grouperPar`, `indexerParId`) au lieu de `filter`/`find` imbriqués.
- Écrans en `ChangeDetectionStrategy.OnPush` ; aperçus de formulaires calculés via `signalFormulaire()`.

## 2. Modèle de données (`core/models`)

| Entité | Rôle | Liens |
|---|---|---|
| `Projet` | Caractéristiques, % de réserve, validation du métré | — |
| `Phase` | Ordre, niveau, tranche, dates, statut, avancement, budget validé, autres coûts | — |
| `Materiau` | Catalogue : unité, prix, origine du prix, fournisseur, date de MAJ, seuil d'alerte, structurel | — |
| `LigneEstimation` | Quantité prévue d'un matériau (prix lu dans le catalogue) | materiau, phase? |
| `Achat` | Commande : qté commandée / livrée, prix négocié, payé, référence | materiau, phase? |
| `Consommation` | Sortie de stock | materiau, phase? |
| `Equipement` | Acheté / loué / disponible, coût compté dans la phase d'acquisition | phase? |
| `Intervention` | Main-d'œuvre journalière ou forfait (+ métiers couverts) | phase? |
| `EnveloppeMainOeuvre` | Fourchette de planification par métier | phase? |
| `Depense` | Registre : catégorie, étape (prévue/commandée/facturée), prévu, payé | phase (obligatoire) |
| `Financement`, `RevenuExceptionnel`, `ObjectifEpargne` | Plan d'épargne | objectif → phases |
| `Parametres` | Unités, catégories, modes de paiement, tarifs journaliers | — |

## 3. Règles de calcul (`core/calculs`)

- Montant = Quantité × Prix unitaire (arrondi au franc).
- Coût de main-d'œuvre = Personnes × Tarif journalier × Jours (+ heures sup. × tarif horaire) ; forfait = montant du devis.
- Reste à payer = Montant convenu − Montant payé.
- Écart budgétaire = Dépenses réelles (payé) − Budget de référence. Positif = dépassement.
- Dépassement **constaté** si payé > budget ; **prévisible** si engagé > budget ; **économie** seulement pour une phase terminée.
- Budget de référence d'une phase = budget validé s'il existe, sinon estimatif.
- Budget estimatif de phase = matériaux + équipements + main-d'œuvre + transport + frais annexes + autres coûts.
- Réserve pour imprévus = base × % ; affichée séparément ; les dépenses « Imprévus » la consomment.
- Engagé d'une dépense = 0 si seulement « prévue » (sauf paiement déjà fait), sinon max(prévu, payé).
- Stock disponible = reçu − consommé ; en attente = commandé − reçu ; reste à commander = prévu − commandé.
- Enveloppe de main-d'œuvre comptée seulement si incluse, non couverte par un forfait et sans intervention réelle du même métier (même périmètre de phase).
- Équipement : compté une fois (achat : qté × prix ; location : qté × coût/jour × jours ; disponible : 0).
- Disponible = épargne actuelle − dépenses personnelles à préserver. Les revenus futurs ne sont comptés qu'à partir du mois qui suit leur arrivée prévue (jamais au mois 0).
- Reste à financer = budget total de référence − payé − disponible (≥ 0).
- Calendrier : besoins = (budget de référence − payé) × (1 + réserve) pour chaque phase non terminée, dans l'ordre ; un besoin est finançable le premier mois où les fonds cumulés couvrent tous les besoins précédents.

**Limites volontaires** : aucune quantité de béton, de fer ou de fondation n'est déduite par ratio. Les éléments
« structurels » affichent une alerte tant que leur source reste « Hypothèse ».

## 4. Schéma PostgreSQL proposé (future version)

```sql
CREATE TABLE utilisateur (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, nom text, cree_le timestamptz DEFAULT now());
CREATE TABLE projet (id uuid PRIMARY KEY, proprietaire_id uuid REFERENCES utilisateur(id), donnees jsonb NOT NULL,
                     pourcentage_reserve numeric(5,2) NOT NULL DEFAULT 10, metre_valide boolean NOT NULL DEFAULT false);
CREATE TABLE phase (id uuid PRIMARY KEY, projet_id uuid REFERENCES projet(id) ON DELETE CASCADE, ordre int, nom text,
                    niveau text, tranche smallint, date_debut date, date_fin date, statut text, avancement numeric(5,2),
                    budget_valide bigint, autres_couts bigint DEFAULT 0, observations text);
CREATE TABLE materiau (id uuid PRIMARY KEY, projet_id uuid REFERENCES projet(id) ON DELETE CASCADE, nom text, categorie text,
                       unite text, prix_unitaire bigint, origine_prix text, fournisseur text, date_maj_prix date,
                       seuil_alerte numeric, structurel boolean, notes text);
CREATE TABLE ligne_estimation (id uuid PRIMARY KEY, materiau_id uuid REFERENCES materiau(id) ON DELETE CASCADE,
                               phase_id uuid REFERENCES phase(id) ON DELETE SET NULL, quantite numeric, source text,
                               valide boolean, inclure_au_budget boolean, commentaire text);
CREATE TABLE achat (id uuid PRIMARY KEY, materiau_id uuid REFERENCES materiau(id), phase_id uuid REFERENCES phase(id) ON DELETE SET NULL,
                    date date, quantite_commandee numeric, quantite_livree numeric, prix_unitaire bigint, fournisseur text,
                    mode_paiement text, montant_paye bigint, reference text, commentaire text);
-- consommation, equipement, intervention, enveloppe_main_oeuvre, depense, financement, revenu_exceptionnel,
-- objectif_epargne : mêmes champs que les interfaces TypeScript, avec phase_id ON DELETE SET NULL.
```

Montants stockés en `bigint` (FCFA entiers), quantités en `numeric`.
