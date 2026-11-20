---
name: agri-frontend
description: "Améliorer les interfaces AGRI CONNECT en préservant la V14, la navigation par cartes et drapeaux et les parcours anglais/arabe RTL."
---

# Interface AGRI CONNECT

Lire les règles AGENTS.md applicables. Utiliser ce Skill pour les pages et interactions ; ne pas refondre le design ou changer de framework par défaut.

## Travail
1. Identifier les sources V14 validées, les routes, composants, états, styles et captures existants. Inventorier navigation par cartes/drapeaux, filtres, catalogue, panier et espaces par rôle. Si V14 manque, conserver l’interface actuelle et signaler que la fidélité à V14 ne peut pas être certifiée.
2. Reprendre les composants existants et limiter les changements au besoin demandé. Préserver les destinations et le retour arrière, les filtres et la sélection de pays. Si une carte géographique existe, conserver aussi ses interactions ; ne pas déduire son existence du seul mot « cartes ».
3. Afficher nom EN/AR, photo, pays nommé avec drapeau, stock, poids/carton, prix CIF par carton et prix/kg calculable, USD/KWD. Afficher explicitement une valeur manquante plutôt que la fabriquer. Préserver la quantité choisie lors des changements de langue.
4. Implémenter +/− et saisie numérique avec limites cohérentes, cartons entiers selon la règle métier, zéro stock désactivé et message explicite. Le panier fait confirmer les limites par le serveur.
5. Utiliser `lang=en`, `dir=ltr` et `lang=ar`, `dir=rtl` selon la langue. Préférer propriétés CSS logiques, isoler références/SKU et montants bidirectionnels, retourner seulement les icônes directionnelles. Traduire erreurs, états vides, confirmations, menus et libellés accessibles, pas uniquement les titres.
6. Vérifier mobile et bureau, clavier, focus visible, contraste, textes arabes longs, chargement, erreur et rupture de stock. Conserver une action nommée sur chaque carte ; éviter les contrôles interactifs imbriqués.

## Preuves attendues
Comparer captures avant/après sur les mêmes écrans et données en EN et AR. Contrôler les liens des cartes et drapeaux, les filtres, les quantités et le panier. Si les données sont simulées, afficher le statut de démonstration. Livrer les changements et les limites constatées, sans déclarer la V14 vérifiée sans source.
