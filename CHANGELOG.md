# Historique des versions

## v1.1.0 — 11/10/2026
Optimisation du code (résultats de calcul inchangés au franc près).
- Calculs : chaque collection n'est plus parcourue qu'une fois (index par identifiant et regroupement par phase
  ou par matériau au lieu de recherches répétées). Mesuré sur un chantier volumineux (1 500 achats, 1 500 dépenses,
  500 interventions, 320 matériaux) : synthèse budgétaire 7,5 → 2,1 ms, stocks 11,0 → 0,3 ms, contrôles 4,9 → 0,9 ms,
  soit environ 7 fois moins de calcul à chaque saisie.
- Signaux par tranche de données : modifier l'épargne ou les paramètres ne relance plus la synthèse budgétaire ni
  les contrôles ; une modification sans changement réel ne déclenche ni recalcul ni sauvegarde.
- Interface : tous les écrans en détection de changements OnPush ; les aperçus de calcul des formulaires (montant,
  solde, écart, stock disponible) sont des signaux calculés au lieu de méthodes réévaluées à chaque rafraîchissement ;
  noms de phases et budgets de phase lus dans un index.
- Alertes : au-delà de 3 cas identiques (dépenses sans phase, stocks faibles, livraisons excédentaires…), une seule
  alerte récapitulative remplace la liste.
- Chart.js : seuls les types de graphiques utilisés sont chargés.
- Tris : comparateur français unique (Intl.Collator) et comparaison directe des dates ISO.
- 57 tests (7 nouveaux : regroupement, phase supprimée, alertes regroupées, tranches de données du store).

## v1.0.0 — 09/10/2026
Première version fonctionnelle complète.
- 12 modules : tableau de bord, projet, 22 phases, catalogue et estimation des matériaux, équipements, main-d'œuvre,
  transport et frais annexes, achats et stocks, registre des dépenses, épargne et financement, rapports, paramètres.
- Données initiales modifiables (estimation de départ 4 860 000 FCFA, enveloppes de main-d'œuvre, catalogue, inventaire).
- Cinq niveaux de budget : estimatif, validé, engagé, payé, reste à financer.
- Contrôles anti-double comptage (forfaits / enveloppes, lot matériel / équipements chiffrés).
- Exports PDF, CSV (Excel), JSON ; import JSON ; impression.
- 50 tests des formules de calcul.
