---
name: agri-catalog
description: "Créer ou corriger le catalogue fournisseur AGRI CONNECT et son import Excel, avec exclusion des trois dernières colonnes et dix exemples fictifs."
---

# Catalogue et import fournisseur

Lire AGENTS.md. Pour préparer le mapping et les tests, lire [le contrat et les dix exemples](references/import-exemples.md). Ces exemples ne sont ni un vrai catalogue ni un tarif fournisseur.

## Import contrôlé
1. Examiner le classeur réel sans le modifier : feuilles, ligne d’en-tête, plage de données, cellules fusionnées, formules et colonnes effectivement utilisées. Sélectionner explicitement la feuille et l’en-tête si plusieurs candidats sont ambigus.
2. Fixer la largeur de la table à partir de ses en-têtes, après exclusion des seules colonnes terminales entièrement vides et sans en-tête. Ne pas utiliser les colonnes simplement mises en forme pour déterminer la fin. Ignorer les trois dernières colonnes de cette table par position, même si leurs noms semblent utiles ; appliquer la même coupure à toutes les lignes, jamais d’après la dernière cellule non vide de chaque ligne. Si la plage est ambiguë, obtenir le bon mapping avant import réel.
3. Après exclusion, mapper les en-têtes conservés vers le schéma existant. Si un champ obligatoire manque ou n’existe que dans les colonnes ignorées, rejeter la ligne ou demander une correspondance ; ne pas réintroduire une colonne exclue. Refuser les structures de trois colonnes ou moins.
4. Valider SKU, noms EN/AR selon les exigences existantes, pays d’origine, devise USD/KWD, prix CIF non négatif, poids/carton strictement positif et stock en cartons entier non négatif. Conserver les nombres comme décimaux exacts et gérer séparateurs locaux explicitement. Ne pas exécuter macros ou formules ; signaler les cellules calculées sans valeur fiable.
5. Vérifier le fournisseur depuis la session et ses droits serveur ; ne pas faire confiance à un identifiant fournisseur dans Excel. Préserver les photos existantes ; utiliser un état sans photo si aucune source fiable. Ne pas télécharger automatiquement les URL arbitraires d’un fichier importé.
6. Produire un aperçu : lignes acceptées/rejetées, erreurs avec numéro de ligne, colonnes ignorées, nouveaux produits et mises à jour. Préférer une validation atomique ; si un mode partiel existe, rendre les rejets explicites. Ne rien écrire avant cette validation.
7. Appliquer l’import dans l’environnement autorisé avec contrainte d’unicité adaptée, généralement fournisseur + SKU. Détecter doublons internes et réimport identique ; ne jamais écraser un autre fournisseur. L’absence d’un produit dans un classeur ne signifie jamais sa suppression.

## Stock et résultat
Coordonner l’import de stock avec les réservations de commandes : ne pas remplacer aveuglément le stock disponible pendant une transaction. Identifier si la colonne signifie stock physique ou disponible ; préserver la règle existante ou faire préciser avant production.
Calculer prix/kg depuis prix/carton et poids net/carton lorsque ces données existent. Une conversion USD/KWD exige taux daté et provenance ; sinon afficher seulement la devise source.
Tester les dix lignes fictives, réimport, doublons, prix négatif, stock fractionnaire, champs absents, fichier invalide et colonnes exclues contenant des valeurs trompeuses. Rapporter le mapping, les résultats et la destination réelle ou simulée.
