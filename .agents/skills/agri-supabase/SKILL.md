---
name: agri-supabase
description: "Implémenter ou auditer Supabase pour AGRI CONNECT : authentification, RLS, stockage et droits fournisseurs, acheteurs, grossistes, restaurants et admin."
---

# Authentification et permissions

Lire AGENTS.md puis [la matrice de permissions](references/permissions.md) pour toute modification d’accès. La matrice est une base conservatrice à confronter aux règles existantes ; ne pas supprimer un droit métier légitime sans résoudre le conflit.

## Méthode
1. Inspecter migrations, tables, relations, politiques RLS, fonctions, stockage, profils et attribution des rôles. Identifier projet et environnement sans afficher les secrets. Adapter au schéma existant, sans recréer la base.
2. Séparer authentification et autorisation. Vérifier utilisateur actif, organisation et appartenance dans chaque action. Fournir les états connexion, déconnexion, expiration et accès refusé en EN/AR. Respecter le parcours d’inscription existant.
3. Stocker les attributions privilégiées dans une source contrôlée côté serveur. Les métadonnées modifiables par l’utilisateur et les champs envoyés par le client ne confèrent aucun droit admin/fournisseur. Vérifier les révocations et le renouvellement des sessions.
4. Activer RLS sur les tables exposées ; définir SELECT/INSERT/UPDATE/DELETE séparément, avec contrôle des lignes existantes et des nouvelles valeurs. Protéger aussi les relations, vues, RPC et objets Storage. Le changement de propriétaire ou d’organisation ne doit pas permettre de contourner une politique.
5. Garder la clé privilégiée hors navigateur et journalisation. Une clé publique ne remplace pas RLS. Pour les actions privilégiées serveur, refaire les contrôles de l’acteur puisque certaines clés contournent RLS. Réduire les droits et le périmètre des fonctions privilégiées ; contrôler appelants et contexte d’exécution.
6. Préparer migrations additives, données de test isolées, sauvegarde et stratégie de retour compatible avant une migration réelle. Ne pas lancer de reset, suppression de table ou désactivation globale de RLS pour corriger une erreur.

## Validation
Avec de vrais contextes JWT de test, vérifier chaque rôle, anonyme, session expirée et comptes de deux fournisseurs/deux acheteurs. Tester lecture et écriture directes par API, pas seulement les écrans. Prouver refus d’accès croisé, changement de rôle, usurpation d’organisation et accès aux fichiers de commande d’autrui. Tester aussi les opérations légitimes pour éviter une politique qui bloque tout.
Documenter politiques modifiées, migrations préparées/appliquées, environnement et tests exécutés. Un mock de session ne prouve pas la sécurité RLS.
