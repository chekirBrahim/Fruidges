---
name: agri-quality-deploy
description: "Tester AGRI CONNECT avec Playwright, vérifier la non-régression V14 et les permissions, puis préparer ou réaliser un déploiement Vercel autorisé."
---

# Qualité et livraison Vercel

Lire AGENTS.md puis [les scénarios de recette](references/recette.md). Utiliser les commandes, versions et outils du dépôt ; consulter les documentations officielles correspondant aux versions installées si leur comportement est incertain.

## Tests
1. Inventorier commandes de build, vérification de types, tests et configuration Playwright. Fixer l’URL cible et interdire toute mutation de production par défaut. Comptes synthétiques, base isolée, fichiers de session hors Git ; masquer secrets et données personnelles dans traces/captures.
2. Tester les comportements visibles avec sélecteurs accessibles et attentes déterministes. Couvrir EN/LTR, AR/RTL, mobile/bureau, navigation cartes/drapeaux et parcours clés. Comparer V14 avec la référence validée ; ne pas accepter automatiquement de nouvelles captures pour masquer une régression.
3. Exécuter les tests pertinents de la matrice. Un mock sert à l’interface ; compléter par tests d’intégration réels isolés pour RLS, concurrence de stock et transactions. Vérifier refus ET accès permis.
4. Corriger les causes dans le périmètre sans supprimer un test, une fonctionnalité ou une protection. Distinguer échec produit, problème d’environnement et test non exécuté. Produire rapport et preuves expurgées.

## Déploiement
1. Identifier équipe, projet Vercel, branche, environnement preview/production, domaine et projet Supabase associé. Vérifier permissions et autorisation existante avant publication ; le simple chargement de ce Skill ne vaut pas demande de publication.
2. Vérifier build, variables par environnement, absence de secrets côté client, URLs d’authentification et compatibilité des migrations. Ne pas brancher une preview avec données fictives sur la base réelle. Ne pas élargir les URLs de redirection ou politiques RLS pour contourner un défaut.
3. Préparer un résumé révisable des changements et résultats. Publier une preview si couverte par la demande, sinon garder les artefacts prêts. Vérifier l’URL effectivement retournée, ouverture des routes profondes, EN/AR, auth, catalogue et panier avec données de test autorisées.
4. Publier en production seulement quand cela fait partie du périmètre autorisé et que les vérifications indispensables passent. Préparer l’identifiant de la version précédente et la procédure de retour. Un rollback Vercel ne restaure pas automatiquement la base : traiter séparément les migrations et ne pas supprimer des données pour revenir en arrière.
5. Après publication, faire une vérification non destructive des parcours. Rapporter URL, environnement, version, tests et limites. Si erreur de permission, cesser les tentatives de mutation et indiquer l’accès manquant ; ne pas changer de compte ou de cible pour contourner le refus.

## Livrable
Rapport court avec scénarios passés/échoués/non exécutés, régressions corrigées, état réel du déploiement et procédure de retour. Ne pas annoncer « prêt pour production » si les tests de sécurité, stock ou parcours critiques n’ont pas pu être effectués.
