# Guide utilisateur — Mon Chantier CI v1.0.0

Ce guide explique comment utiliser l'application, même sans connaissance particulière de la gestion de chantier.

---

## 1. Avant de commencer

- Vos données sont **enregistrées automatiquement dans ce navigateur**, sur cet appareil. Elles ne passent pas
  automatiquement de votre ordinateur à votre téléphone. Pour changer d'appareil : **Paramètres → Exporter les données
  (JSON)**, puis **Importer une sauvegarde** sur l'autre appareil.
- Exportez une sauvegarde JSON régulièrement (par exemple chaque semaine).
- Tant que le métré n'est pas validé par un ingénieur, tous les écrans et rapports affichent
  **« Estimation indicative — à valider par un professionnel »**.

## 2. Le menu

| Rubrique | À quoi elle sert |
|---|---|
| Tableau de bord | Vue d'ensemble : budgets, dépenses, avancement, alertes, graphiques |
| Mon projet | Caractéristiques du bâtiment et du terrain, réserve pour imprévus, validation du métré |
| Phases de construction | Les 22 phases : dates, statut, avancement, budget de chaque phase |
| Matériaux | Catalogue (prix) et estimation des besoins (quantités) |
| Équipements | Brouettes, pelles, échafaudages… achetés, loués ou déjà disponibles |
| Main-d'œuvre | Ouvriers, prestataires, forfaits, enveloppes de planification |
| Achats et stocks | Commandes, livraisons, paiements aux fournisseurs, sorties de stock |
| Dépenses | Registre des dépenses, transports et frais annexes, tous les paiements |
| Épargne | Épargne, revenus prévus, objectifs, calendrier de financement |
| Rapports | Devis prévisionnel et bilan de chantier : impression, PDF, CSV/Excel |
| Paramètres | Unités, catégories, tarifs, prix, sauvegarde et import |

Sur téléphone, le menu s'ouvre avec le bouton ☰ en haut à gauche.

## 3. Comprendre les cinq niveaux de budget

1. **Budget estimatif initial** : calculé à partir de vos hypothèses (quantités × prix) + réserve pour imprévus.
2. **Budget validé** : montant saisi dans une phase après l'étude technique (champ « Budget validé après étude »).
   Quand il existe, il remplace l'estimatif pour cette phase.
3. **Engagé** : ce que vous vous êtes engagé à payer (commandes, contrats, factures).
4. **Payé** : l'argent réellement sorti.
5. **Reste à financer** : budget total − déjà payé − épargne disponible.

Une **commande**, une **facture** et un **paiement** sont trois choses différentes : seul le « montant payé » compte
comme dépense réelle.

## 4. Premiers pas recommandés

1. **Mon projet** : vérifiez les informations (surface du terrain 114 m², R+3, Abidjan…). Renseignez la surface
   constructible et la surface construite quand le plan de l'architecte est disponible. Réglez la réserve pour imprévus
   (10 % par défaut).
2. **Matériaux → Catalogue** : mettez à jour les prix avec ceux de vos fournisseurs (cliquez dans la case du prix,
   tapez, puis quittez la case). La date de mise à jour s'enregistre automatiquement. Les matériaux marqués
   « Prix à renseigner » n'ont pas encore de prix.
3. **Matériaux → Estimation des besoins** : l'estimation de départ (sous-total **4 860 000 FCFA**) est préchargée
   comme hypothèse. Pour chaque ligne :
   - choisissez la **phase** concernée dans la liste (sinon elle reste « À répartir ») ;
   - remplacez la quantité par celle du **métré de l'ingénieur** dès que vous l'avez, et changez la source ;
   - cochez **Validée** quand un professionnel l'a confirmée.
4. **Main-d'œuvre** : les enveloppes de départ (chef maçon, maçons, manœuvres, ferrailleurs, coffreurs) servent de budget
   en attendant les devis. Dès que vous saisissez une intervention réelle ou un forfait, l'enveloppe correspondante est
   **automatiquement retirée du budget** pour éviter de compter deux fois.
5. **Épargne** : saisissez votre épargne actuelle, votre capacité d'épargne mensuelle et le montant personnel à ne pas
   toucher. Le calendrier indique à partir de quel mois chaque phase peut être lancée.

## 5. Au quotidien sur le chantier

### Acheter des matériaux
**Achats et stocks → Ajouter un achat** : date, matériau (le prix du catalogue est proposé), phase, quantité commandée,
quantité livrée, prix, fournisseur, mode de paiement, montant payé, numéro de facture ou de reçu.
L'aperçu affiche le **montant total** et le **solde dû**. Cochez « Mettre à jour le prix du catalogue » pour mémoriser
le prix réellement payé. Quand le reste de la commande arrive, cliquez sur **Tout reçu**.

### Sortir des matériaux du stock
**Achats et stocks → Sorties de stock → Ajouter une sortie**. L'application refuse une sortie supérieure au stock
disponible. L'onglet **État des stocks** montre, pour chaque matériau : prévu, commandé, reçu, consommé, disponible,
en attente de livraison et reste à commander. Un stock est signalé **faible** sous le seuil d'alerte défini dans la fiche
du matériau.

### Payer les ouvriers
**Main-d'œuvre → Ajouter une intervention** :
- **Tarif journalier** : nombre de personnes × tarif × nombre de jours (+ heures supplémentaires) ;
- **Forfait** : montant du devis ; cochez les métiers déjà couverts par ce forfait (par exemple un chef maçon dont le
  devis inclut ses maçons et manœuvres).

Saisissez les acomptes dans « Montant déjà payé » : le **reste à payer** est calculé automatiquement. L'onglet
**Récapitulatif** totalise par métier et par phase.

### Transports et frais annexes
**Dépenses → Transport et frais annexes** : cliquez sur un modèle (Livraison du ciment, Transport du sable, Gardiennage,
Études techniques…). Chaque dépense doit être **affectée à une phase**. Indiquez l'étape (prévue, commandée, facturée)
et le montant réellement payé. Les dépenses de catégorie **Imprévus** consomment la réserve pour imprévus, affichée à part.

### Suivre une phase
**Phases de construction** → cliquez sur une phase : modifiez dates, statut, avancement, observations, budget validé.
La carte « Budget de la phase » détaille matériaux, équipements, main-d'œuvre, transport, frais, engagé, payé et écart.
Vous pouvez aussi y ajouter des matériaux ou affecter des lignes de l'estimation non répartie.

Pour **commencer par le gros œuvre du RDC et du R+1**, travaillez sur la **tranche 1** (phases 1 à 8) ; les tranches 2
(R+2, R+3) et 3 (second œuvre, finitions) pourront être lancées plus tard.

## 6. Épargne et financement

- **Disponible pour le chantier** = épargne actuelle − dépenses personnelles à préserver.
- Un **revenu exceptionnel prévu** (prime, tontine, vente…) n'est **jamais** compté avant sa date. Le jour où vous le
  recevez, cliquez sur **Reçu** : il est ajouté à votre épargne actuelle.
- **Objectifs d'épargne** : choisissez des phases (ou un montant) et une date souhaitée ; l'application indique en combien
  de mois l'objectif sera atteint et si vous êtes « À temps » ou « En retard ».
- **Calendrier** : chaque ligne montre les fonds cumulés et les travaux qui deviennent finançables ce mois-là.

## 7. Rapports

**Rapports** : choisissez **Devis prévisionnel** ou **Bilan de chantier**, puis :
- **Imprimer** (ou « Enregistrer au format PDF » dans la fenêtre d'impression) ;
- **Exporter en PDF** ;
- **Exporter CSV / Excel** (s'ouvre directement dans Excel).

Les tableaux de Matériaux, Équipements, Main-d'œuvre, Achats et Dépenses ont aussi un bouton **Exporter (CSV)**.

## 8. Alertes et contrôles

Le tableau de bord liste les incohérences détectées : métré non validé, quantités structurelles encore en hypothèse,
doubles comptages possibles (forfait + journalier, lot matériel + inventaire chiffré), dépassements constatés ou
prévisibles, stocks faibles ou négatifs, dépenses sans phase, revenus prévus non reçus. Cliquez sur une alerte pour aller
à l'écran concerné.

## 9. Questions fréquentes

**Le budget d'une phase est à 0 FCFA, est-ce normal ?** Oui, tant qu'aucun matériau, ouvrier ou frais ne lui est affecté.
L'estimation de départ est « non répartie » : affectez ses lignes aux phases dans Matériaux.

**Pourquoi une enveloppe de main-d'œuvre est-elle barrée ?** Elle est exclue du budget parce qu'un forfait couvre déjà
ce métier ou parce que des interventions réelles ont été saisies : c'est le contrôle anti-double comptage.

**J'ai changé de téléphone.** Exportez le JSON depuis l'ancien appareil (Paramètres) puis importez-le sur le nouveau.

**Je veux tout recommencer.** Paramètres → Revenir aux données initiales (exportez d'abord une sauvegarde).
