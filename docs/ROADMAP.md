# Fruidges — suivi de développement

## Étape 1 : fondation locale

Original V16 préservé ; module acheteur extrait ; nom Fruidges appliqué ; bannière de démonstration ; scripts de lancement, vérification et build ; configuration Vercel ; skills du propriétaire intégrés.

La transformation préserve les fonctions existantes. Elle ne corrige pas encore leurs limites métier et ne certifie pas la conformité à l’ensemble des skills.

## Étape 2 : parcours connecté

Créer une base Supabase de développement isolée. Implémenter les comptes et organisations, les rôles distincts, la validation administrateur et les politiques RLS. Relier catalogue fournisseur, commande acheteur et suivi administrateur aux mêmes données. Conserver le parcours grossiste → restaurant prévu par la V16, avec droits explicitement définis.

L’URL du projet Supabase et sa clé publique seront nécessaires pour le branchement. Aucun mot de passe ou secret ne doit être envoyé dans le chat ni enregistré dans Git. La base n’a pas encore été créée.

## Écarts hérités à résoudre

- Les deux interfaces conservent des états indépendants en mémoire ; pas de persistance ni de synchronisation serveur.
- Les sélecteurs de rôle ne constituent pas une authentification.
- Une partie de l’interface reste en français et le RTL du cadre principal est incomplet.
- Les anciens écrans mélangent kg et cartons et utilisent des conversions fictives. Remplacer ces calculs par des devises sources explicites et des décimaux exacts.
- L’import Excel ne respecte pas encore le contrat d’exclusion des trois dernières colonnes, de validation et de prévisualisation atomique.
- La commande acheteur ne réserve pas le stock côté serveur et n’est pas protégée contre les soumissions concurrentes.
- Le téléchargement Word produit du HTML avec une extension .doc ; un vrai .docx reste à développer.
- Les filtres géographiques doivent être reliés aux produits des fournisseurs sélectionnés.
- Certaines images d’exemple ne correspondent pas nécessairement aux produits.

## Validation avant utilisation réelle

Tester les accès permis et interdits avec plusieurs comptes, la concurrence sur le dernier carton, l’idempotence, les prix modifiés, les annulations, les imports, les documents EN/AR et les parcours mobile/clavier. Les contrôles statiques initiaux ne prouvent pas ces garanties.

## Publication

GitHub → prévisualisation Vercel → validation métier → production. Les droits d’écriture sur fruidges-design/Fruidges et l’inscription Vercel sont encore à résoudre. Le développement local peut continuer indépendamment.

## Décisions du 19 novembre 2026

Dépôt officiel remplacé par chekirBrahim/Fruidges ; origin local mis à jour, droits d’écriture disponibles. Connexion réelle préparée séparément du prototype. Inspection du schéma Supabase en attente d’accès au tableau de bord du propriétaire. Les dates et étapes antérieures décrivent l’historique, pas l’état actuel complet ; consulter README.md et VALIDATION.md.
