# Vérification de la première étape

- Référence V16 : empreinte SHA-256 vérifiée, original inchangé.
- Actions HTML : comparaison automatique avec la référence et le module acheteur original réussie.
- JavaScript : les quatre scripts intégrés sont syntaxiquement valides.
- Build : réussi ; dist/index.html et dist/buyer.html générés.
- Serveur local : démarré, mais requêtes HTTP bloquées par les permissions réseau de l’environnement.
- Vérification navigateur : non effectuée, ouverture de la prévisualisation en échec (délai de connexion dépassé).
- Tests de parcours, mobile, captures avant/après, Supabase/RLS et concurrence : non exécutés.
- Git : dépôt local initialisé ; origin = https://github.com/chekirBrahim/Fruidges.git. Aucun push ni déploiement.

Cette livraison prépare la reprise du prototype. Elle ne constitue pas encore le premier parcours connecté ni une application de production.

## Mise à jour : connexion de démonstration

- Sélecteur de rôle retiré ; connexion EN/AR et déconnexion ajoutées.
- Navigation inter-acteurs retirée de l’espace acheteur.
- Tests automatisés de logique UI réussis : quatre comptes, code incorrect, compte inconnu, changement de rôle refusé dans le parcours et déconnexion.
- Syntaxe des cinq scripts intégrés et du script de connexion vérifiée.
- La comparaison stricte de toutes les actions HTML de la première étape est remplacée par les contrôles ciblés de navigation : les changements de navigation ont été expressément demandés.
- Aucun test navigateur supplémentaire ; aucune garantie d’authentification serveur. Le code d’accès est public et fictif.

## 19 novembre 2026 — connexion réelle et changement de dépôt

- origin vérifié : https://github.com/chekirBrahim/Fruidges.git ; droits GitHub push/admin confirmés par le connecteur.
- SDK Supabase installé avec package-lock.json. Audit npm à l’installation : aucune vulnérabilité signalée.
- 15 scénarios simulés de contrôle d’identité et d’appartenance réussis : cinq rôles, absence de rôle, rôle inconnu, suspension, autre utilisateur, organisation absente, erreur de base, erreur Auth, refus après connexion.
- Contrôles du prototype, syntaxe et build réussis.
- Requêtes HTTP locales : connexion, bundle JavaScript et démonstration renvoient 200.
- Réponse réelle Supabase /auth/v1/settings : 200 avec clé publique. Le refus de /rest/v1/ est une restriction de la description OpenAPI, pas un diagnostic de panne.
- Page de connexion observée dans le navigateur en anglais puis en arabe. Pas encore de recette mobile ni de test avec un vrai compte autorisé.
- Protection ajoutée contre une réponse tardive de vérification après déconnexion ; tests de concurrence UI à compléter.
- Tableau de bord Supabase : accès bloqué sur la page de connexion du propriétaire. Aucun schéma distant inspecté, aucune migration exécutée.
- Tests RLS réels, accès croisés et concurrence de stock NON EXÉCUTÉS. Les tests simulés ne les remplacent pas.
- Aucun push GitHub ni déploiement Vercel.


## 20 novembre 2026 — inspection du tableau de bord

Session Chrome du propriétaire retrouvée. URL observée : projet otaodwohbksacvbheshd, Database > Tables, schéma public, 0 table. Il ne s’agit pas d’une preuve sur les schémas internes Auth/Storage. Aucun utilisateur Auth inspecté, aucune requête SQL exécutée.

Script supabase/01-access.sql préparé : transaction, deux tables nouvelles, cinq rôles distincts, RLS, lecture de sa propre appartenance et de son organisation active, aucune écriture client ni attribution admin. Aucun changement distant appliqué. Les tests RLS avec JWT restent à exécuter après installation.

## 20 novembre 2026 — installation appliquée avec autorisation

Projet : otaodwohbksacvbheshd. Le propriétaire a autorisé l’exécution de supabase/01-access.sql. Script exécuté via SQL Editor dans sa session Chrome ; résultat affiché : Success. No rows returned.

Contrôle SQL indépendant des catalogues PostgreSQL :

| Table | RLS | SELECT anon | SELECT authenticated | INSERT/UPDATE/DELETE authenticated | Nombre de politiques |
|---|---|---|---|---|---|
| fruidges_memberships | true | false | true | false | 1 |
| fruidges_organizations | true | false | true | false | 1 |

Les politiques limitent la lecture à sa propre appartenance et à son organisation active. Aucun utilisateur Auth, aucune organisation ni appartenance n’a été ajouté par ce script. Les tests avec plusieurs vrais utilisateurs et JWT restent à exécuter ; l’inspection des privilèges ne les remplace pas. Aucun produit, aucune commande, aucun push GitHub ni déploiement Vercel effectués.

Test API réel complémentaire : SELECT avec clé publishable sans JWT utilisateur sur chacune des deux tables refusé, HTTP 401 / PostgreSQL 42501 (permission denied). Résultat attendu ; ne pas accorder SELECT au rôle anon pour contourner ce refus.

Provision initiale effectuée : invitation Auth créée puis acceptée pour l’adresse fournie par le propriétaire. Le compte affiche `confirmed_at` et `email_confirmed_at`; organisation `Fruidges Demo` créée, appartenance vérifiée avec rôle `admin` et statut `active`, première connexion enregistrée. Les tests RLS avec JWT restent à exécuter.

Migration catalogue `supabase/02-catalog.sql` appliquée avec autorisation au projet otaodwohbksacvbheshd. Vérification du catalogue PostgreSQL : `fruidges_products` présente, RLS activée, SELECT anonyme refusé, SELECT/INSERT authentifiés accordés sous politiques, 4 politiques présentes et 0 produit créé. Les politiques réservent la création, modification et suppression aux fournisseurs propriétaires et aux admins ; les membres actifs lisent les offres publiées. Aucun test JWT RLS inter-comptes n’a encore été effectué.

## 20 novembre 2026 — interface du catalogue Supabase

- `npm test` réussi, y compris les tests ciblés de formatage décimal, prix/kg, poids invalide et échappement HTML.
- `npm run build` réussi ; l’application reste servie localement sur `http://127.0.0.1:4173`.
- Page de connexion observée après rechargement ; le bundle `auth-live.bundle.js` répond HTTP 200.
- La tentative d’interaction avec le bouton de langue arabe a expiré. L’affichage arabe de cette nouvelle interface n’est donc pas vérifié visuellement.
- Aucun identifiant n’a été saisi ; l’écran du catalogue après authentification, la création d’un produit et les permissions avec de vrais JWT ne sont pas vérifiés.
- La table distante reste vide selon la vérification précédente ; aucun produit fictif n’a été ajouté.

## 20 novembre 2026 — création de comptes par un admin

- Ajout local du formulaire admin bilingue, de la génération d’un lien d’activation non envoyé par e-mail, et de l’écran de définition du mot de passe.
- La fonction Edge vérifie la session, l’appartenance admin active et attribue l’organisation côté serveur ; les rôles sont limités à la liste autorisée. L’organisation et les métadonnées envoyées par le client sont ignorées.
- `npm test`, `npm run build` et `node --check` des modules JavaScript concernés réussis.
- La fonction Edge n’est pas déployée et aucun compte/lien n’a été créé dans la base.
- Reste à configurer les origines et URLs de redirection Auth, déployer la fonction avec `verify_jwt`, puis tester la création et les JWT réels. Aucun test RLS inter-comptes n’est revendiqué.

## 20 novembre 2026 — publication d’un brouillon

- L’action UI publie les brouillons du propriétaire : fournisseur sur `source`, acheteur/grossiste sur `resale`, et admin selon les règles serveur. L’écriture est refiltrée par `id` et `status='draft'`; les politiques RLS restent l’autorité.
- Tests ajoutés : publication par rôle/canal, refus d’un acheteur sur un brouillon fournisseur, échec API visible, refus inter-organisation.
- `npm test`, `npm run build` et vérification de syntaxe réussis. Les tests RLS utilisent PGlite et exécutent les migrations locales ; ce n’est pas une preuve sur Supabase hébergé.
- La sortie `pg_policies` fournie pour le projet hébergé référence `sales_channel` et confirme les politiques par rôle/canal attendues pour lecture, création, mise à jour et suppression. Le modèle RLS catalogue de `03-isolation-DRAFT.sql` est donc présent en production (script exact ou équivalent). La migration `04-service-membership-read.sql` reste non vérifiée et n’est pas nécessaire à la publication.
- Aucun produit réel n’a été modifié ni publié.

## Rôles acheteur/grossiste — migration préparée

- Alignement local sur quatre rôles : admin, fournisseur, acheteur/grossiste, restaurant. Les nouveaux formulaires et le provisioning serveur n’acceptent plus `wholesaler` comme rôle séparé ; les anciens comptes sont normalisés côté interface.
- `supabase/06-buyer-wholesaler-role.sql` convertit les appartenances historiques et met à jour les politiques catalogue et, si le bucket d’images existe, les politiques Storage.
- `npm test` et `npm run build` passent. PGlite couvre la conversion, les offres source/resale, la publication acheteur propriétaire, l’accès restaurant aux seules resale publiées, l’isolation inter-organisations et les images privées.
- Le propriétaire a indiqué avoir exécuté la migration 06 par erreur ; cette exécution n’a pas été vérifiée indépendamment ici. Aucun JWT réel ni produit hébergé n’a été testé. L’acheteur ne voit toujours pas un produit fournisseur en brouillon : le statut doit être `published` et le canal `source`.

## Revue locale du 20 novembre 2026

Voir REVIEW-2026-11-20.md. Corrections des états de session et réponses tardives ; tests de régression ajoutés à scripts/test-live-state.mjs. npm test et npm run build réussis. Deux problèmes métier/permissions restent ouverts : organisation commune imposée aux nouveaux professionnels et accès restaurant aux offres fournisseur. Aucune mutation distante durant la revue.

## Première adaptation de l’espace admin connecté

- `src/auth-live.js` affiche une navigation admin EN/AR. Les compteurs proviennent uniquement des produits lus dans Supabase ; la liste des comptes, les demandes et les commandes sont explicitement signalées comme non connectées, sans données d’exemple.
- Le formulaire existant de création de compte et le catalogue existant sont conservés dans leurs sections respectives. La création nécessite toujours le déploiement et la configuration de la fonction sécurisée `admin-create-user`.
- `npm test` et `npm run build` réussis. Les nouveaux tests UI utilisent un contexte simulé ; ils ne prouvent pas le comportement RLS hébergé.
- La page locale de connexion s’est ouverte, mais aucun compte n’a été saisi. Le tableau admin réel n’a donc pas été observé dans le navigateur ; l’interaction navigateur de langue a expiré et aucune comparaison de captures avant/après n’a été réalisée.
- Le port local 4173 était déjà occupé ; le lancement d’un second serveur a échoué avec `EADDRINUSE`. Aucun push, déploiement Vercel, migration ou changement de données réelles n’a été effectué.

## Répertoire admin des entreprises — préparation locale

- Ajout de trois vues de répertoire EN/AR (fournisseurs, acheteurs/grossistes, restaurants), regroupées par entreprise, avec comptes agrégés par statut et produits du catalogue liés à leur entreprise. Aucun email de connexion n’est renvoyé.
- Le répertoire n’attribue plus une offre fournisseur (`source`) à une entreprise acheteuse : les produits doivent correspondre à la fois à l’organisation propriétaire et au canal attendu (`source` fournisseur, `resale` acheteur). Les lignes de canal incohérent sont signalées pour vérification dans Produits et ne sont pas déplacées automatiquement.
- Le pays de l’entreprise est modifiable par code ISO à deux lettres. Les fiches existantes restent explicitement « non renseignées » jusqu’à saisie; aucun pays n’est inventé.
- La migration 07 ajoute le champ nullable, les droits de lecture `service_role` nécessaires au seul endpoint serveur et un RPC de mise à jour qui revérifie l’appartenance admin active. Les clients n’obtiennent pas de droit direct de lecture/écriture supplémentaire.
- `npm test`, `npm run build` et `node --check` des modules Edge concernés réussis. Le test PGlite vérifie maintenant aussi les lectures service-role de l’annuaire et les refus d’écriture/RPC directs côté authenticated; cela ne prouve pas la sécurité du projet Supabase hébergé.
- Migration 07 et fonction `admin-organizations` non appliquées/déployées. Le répertoire connecté, l’affichage réel de l’espace admin, les JWT de vrais comptes, l’anglais/arabe dans un navigateur et les captures mobile/bureau restent à vérifier après déploiement autorisé.

## Import Excel — classeur fourni

- `Order 1.xlsx` inspecté localement en lecture seule : un onglet, en-têtes ligne 5, 93 lignes produit (lignes 6 à 98). Le classeur original n’a pas été modifié; aucune formule ni macro n’a été exécutée.
- La plage tabulaire va de C à N. Les trois dernières colonnes L–N (commandes/poids/montant) sont exclues par position; elles ne fournissent pas le stock. Les colonnes J/K « landed cost » ne sont pas substituées au prix CIF.
- Le prix CIF de la colonne I est libellé AUD/BOX, devise refusée par le catalogue qui accepte USD/KWD seulement. Le propriétaire confirme que l’AUD est correct; l’importateur local bloque ce cas avec un message explicite. Aucun taux n’a été inventé et aucune conversion ni import Supabase n’a eu lieu.
- Les données retenues contiennent des formules avec valeurs mises en cache dans la désignation arabe; elles sont signalées pour vérification. La ligne 85 n’a pas de conditionnement; les lignes 54–55 produisent un SKU déterministe en doublon selon la règle actuelle. Le pays d’origine et le stock disponible ne figurent pas dans les colonnes importables et doivent être confirmés indépendamment.
- Le propriétaire confirme `AU` comme pays d’origine commun. Le stock n’est pas présent dans le classeur; l’interface exige maintenant un stock en cartons par produit et ne reprend pas les quantités de commande.
- Tests du parseur : les colonnes terminales et les coûts landed ne contaminent pas le prix CIF; les devises hors USD/KWD sont rejetées; le stock par ligne doit être un entier non négatif. À compléter après réception des prix CIF source en USD/KWD et correction/exclusion de la ligne 85 et du doublon 54–55.

## Erreur de schéma des champs de change

- L’erreur `42703: column fruidges_products.fx_usd does not exist` indique que le client sélectionne/envoie des colonnes de taux absentes du schéma connecté.
- `supabase/11-product-currencies.sql` a été resserré localement pour ajouter uniquement `fx_usd`, `fx_kwd`, `fx_date`, `fx_source` et leur contrainte de cohérence. Il ne supprime plus la restriction de devise USD/KWD et ne change pas la précision du prix.
- Migration testée localement avec PGlite : champs de taux valides acceptés, taux d’identité USD incohérent refusé, devise AUD toujours refusée. Aucun changement Supabase distant n’a été exécuté.
