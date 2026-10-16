# Améliorations possibles pour les versions futures

## Données et comptes
1. **API + PostgreSQL** : remplacer `LocalStorageAdapter` par un adaptateur HTTP (NestJS, Spring Boot ou Express) ; schéma proposé dans `ARCHITECTURE.md`.
2. **Comptes utilisateurs** et rôles (propriétaire, chef de chantier, ingénieur en lecture, comptable).
3. **Synchronisation multi-appareils** et mode hors connexion (PWA installable sur téléphone, file d'attente des modifications).
4. **Historique des modifications** (qui a changé quel prix, quand) et annulation.
5. Gestion de **plusieurs chantiers** dans le même compte.

## Chantier
6. **Pièces jointes** : photos de chantier, factures et reçus scannés liés aux achats et dépenses.
7. **Diagramme de Gantt** des phases, avec dépendances et chemin critique.
8. **Journal de chantier** quotidien (météo, présents, travaux réalisés, incidents).
9. **Pointage des ouvriers** par jour et calcul automatique des jours travaillés.
10. Gestion des **acomptes multiples** (échéancier de paiement par intervention ou par fournisseur).
11. **Comparateur de devis** fournisseurs et historique des prix (évolution du prix du ciment, du fer…).
12. Import du **métré de l'ingénieur** depuis un fichier Excel/CSV.
13. Bibliothèque de **modèles de phases** (R+1, R+2, villa basse) réutilisables.

## Finances
14. Prise en compte d'un **crédit bancaire** ou d'un prêt familial (échéancier, intérêts).
15. Suivi des **tontines** comme source de financement prévue.
16. **Notifications** : rappel d'épargne mensuelle, échéance d'un paiement, stock faible (SMS/WhatsApp/e-mail).
17. Estimation des **revenus locatifs** futurs des appartements et calcul de la rentabilité.

## Rapports et ergonomie
18. Export **Excel natif (.xlsx)** avec mise en forme et plusieurs onglets.
19. Rapport mensuel automatique envoyé par e-mail.
20. Thème sombre et taille de police réglable.
21. Tableaux triables par colonne et pagination pour les longues listes.
22. Tests de bout en bout (Playwright) et intégration continue.
