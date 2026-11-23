# Fruidges

Application en développement, issue de la V16 AGRI CONNECT. Dépôt officiel : https://github.com/chekirBrahim/Fruidges.

## Lancer localement

Node.js 22 ou ultérieur :

```sh
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:4173. Le serveur effectue le build au démarrage ; le redémarrer après une modification. La connexion réelle doit être ouverte via HTTP et non en double-cliquant sur src/index.html.

```sh
npm test
npm run build
```

Vercel utilise npm run build et le dossier dist, conformément à vercel.json.

## État réel

- index.html : connexion EN/AR utilisant le SDK Supabase officiel ; aucun choix de rôle.
- Projet Supabase ciblé : otaodwohbksacvbheshd. La clé publishable est publique et destinée au navigateur. Aucune clé privilégiée n’est incluse.
- L’identité est vérifiée par Auth ; le rôle est lu dans fruidges_memberships, jamais depuis les métadonnées utilisateur modifiables.
- Les sessions sont persistées par le SDK Supabase dans le navigateur ; après rechargement, l’identité et l’appartenance sont revérifiées côté serveur avant affichage de l’espace. Les droits sont revérifiés au retour sur l’onglet et toutes les 60 secondes. Les futures opérations métier devront toutes être protégées par RLS côté serveur.
- Les tables d’organisation et d’appartenance ont été installées et leur RLS vérifiée le 20 novembre 2026. Un compte administrateur est rattaché à l’organisation Fruidges Demo avec le rôle admin actif.
- Le catalogue réel est connecté. Les commandes ne sont pas encore connectées ; les espaces affichent un état explicite sans données fictives.
- Les espaces importer, distributor et HORECA du site connecté partagent la navigation V16 : exploration par pays d’origine, catalogue live et panier par cartons. Seuls importer et distributor disposent aussi de leur espace d’offres de revente ; HORECA ne peut ni créer ni publier de produits et conserve les drapeaux/cartes-pays sans carte géographique. La carte Leaflet et les tuiles OpenStreetMap avec attribution restent disponibles aux autres acheteurs ; ses marqueurs indiquent les pays d’origine de manière approximative, jamais des adresses d’entreprises. Les espaces authentifiés affichent le rôle vérifié et le nom du compte fourni par Auth (courriel en repli si aucun nom n’est renseigné). Les quantités du panier restent locales jusqu’à confirmation. Le parcours de commande est raccordé au RPC défini dans `supabase/14-order-workflow.sql` : une commande distincte par vendeur, réservation des cartons à la soumission, confirmation/refus par le vendeur et annulation par l’acheteur tant que la commande est en attente. L’acheteur, le vendeur concerné et l’admin peuvent consulter la commande ; l’admin est en lecture seule. La migration 14 est préparée mais n’est pas appliquée à Supabase : le service réel reste indisponible tant qu’elle n’a pas été vérifiée et appliquée par le propriétaire. Aucun jeu de commandes fictives n’est affiché. Les bons Word et résumés WhatsApp restent des brouillons locaux non contractuels ; WhatsApp ne les envoie pas et n’attache pas de document. Les compteurs géographiques sont des produits publiés par pays d’origine ; le modèle courant ne contient pas de villes d’entreprise. Les coordonnées des vendeurs ne sont pas accessibles à l’acheteur dans le schéma actuel.
- L’espace admin officiel dispose d’une navigation EN/AR, de statistiques calculées depuis le catalogue Supabase lisible par l’admin, et de pages dédiées. La liste des comptes et la gestion des demandes d’accès ne sont pas connectées. La page Commandes utilise le workflow décrit ci-dessus et n’autorise pas l’admin à changer leur statut.
- Les listes admin fournisseurs / acheteurs-grossistes / restaurants regroupent les entreprises et affichent leurs produits et le nombre de comptes par état. Les produits sont associés à leur entreprise et filtrés par canal cohérent avec son rôle (`source` pour un fournisseur, `resale` pour un acheteur); les incohérences sont signalées, pas réattribuées. Elles utilisent la fonction Edge `admin-organizations`; les emails de connexion ne sont pas renvoyés. Le pays d’entreprise est nullable et affiché comme non renseigné jusqu’à sa saisie.
- `supabase/02-catalog.sql` a créé la table de catalogue avec RLS ; les fournisseurs, importateurs et distributeurs créent leurs propres produits. À la création manuelle ou par Excel, l’admin choisit une entreprise propriétaire active et un ou plusieurs rôles destinataires ; ces choix explicites sont contrôlés par les politiques et déclencheurs Supabase.
- La création de comptes par les admins utilise `supabase/functions/admin-create-user/index.js` ; elle doit être déployée et configurée avant utilisation. La clé privilégiée reste côté serveur.
- demo.html conserve le prototype et ses parcours. Ses comptes fictifs et données en mémoire ne sont pas une authentification réelle. Utiliser uniquement des données de test.

## Supabase : prochaine étape

Le propriétaire a partagé les politiques RLS du catalogue hébergé ; elles confirment les règles par canal de `supabase/03-isolation-DRAFT.sql` ou un équivalent. La migration `supabase/06-buyer-wholesaler-role.sql` a été exécutée par le propriétaire ; ne pas la relancer.

`supabase/07-admin-organization-directory.sql` est une migration additive préparée mais non appliquée. Elle ajoute le pays ISO à la fiche entreprise; les entreprises existantes restent `NULL` jusqu’à saisie par un admin. Elle autorise aussi `service_role` à lire les entreprises et appartenances, uniquement pour l’endpoint serveur vérifiant l’admin actif; aucun droit de lecture client supplémentaire n’est accordé. L’endpoint Edge n’est utilisable qu’après application manuelle de cette migration et son déploiement.

`supabase/11-product-currencies.sql` ajoute les champs optionnels de taux et leur date/provenance, utilisés par le client. Elle conserve la contrainte de devise source USD/KWD et ne convertit aucun prix. Appliquer cette migration avant d’utiliser le client qui sélectionne ou envoie les champs `fx_*`.

### Commandes persistées

`supabase/14-order-workflow.sql` définit la migration additive des commandes : une commande par vendeur, lignes commerciales figées, RLS participant, réservation transactionnelle/idempotente du stock et transitions acheteur/vendeur. La capture réseau reçue confirme que le RPC de commande existe sur l’environnement testé, mais pas l’état complet de ses migrations. Ne pas rejouer la migration 14 si elle a déjà été appliquée. Le statut initial `in_progress` signifie « en attente de confirmation du vendeur » ; paiement et expédition ne sont pas gérés.

`supabase/15-order-reservation-overlap-fix.sql` corrige la protection du stock lorsque plusieurs commandes réservent le même produit. Elle doit être examinée puis appliquée manuellement après vérification que la migration 14 est installée. Une nouvelle réservation décrémente le stock même si une autre commande est en attente ; les augmentations manuelles restent protégées et les annulations/refus restituent les cartons dans leur transaction. `npm test` couvre les migrations en PGlite local, mais ne prouve pas le fonctionnement RLS sur le projet Supabase hébergé.

## Création de comptes par un admin

L’espace admin contient un formulaire EN/AR pour créer un compte et choisir l’un des quatre rôles : fournisseur, acheteur/grossiste, restaurant ou admin. La liste des comptes individuels n’est pas encore connectée. La fonction `admin-create-user` vérifie le JWT et l’appartenance admin active côté serveur, puis rattache le compte à une entreprise explicitement choisie : nom pour une nouvelle entreprise, ou UUID pour une entreprise existante. Le RPC transactionnel est réservé au service serveur. Elle génère un lien d’activation à usage unique sans envoyer d’e-mail ; l’admin le copie et le communique directement à la personne. Le navigateur transmet le choix d’entreprise, mais aucun mot de passe et ne reçoit jamais la clé privilégiée. Le lien est un secret temporaire à partager uniquement avec son destinataire.

La fonction `admin-organizations` vérifie également le JWT et l’appartenance admin active côté serveur avant de lire les entreprises. Elle renvoie les noms, pays, rôles/statuts agrégés et aucun email ou identifiant de membre. L’écriture du pays passe par un RPC réservé à `service_role`, qui revérifie le rôle admin actif.

La fonction est préparée mais doit être déployée après vérification de la migration catalogue, puis de la migration `supabase/06-buyer-wholesaler-role.sql` avant la mise en service du nouveau rôle combiné. Exécuter le contrôle en lecture seule `supabase/03-preflight.sql` et sauvegarder les tables concernées. La migration et le code doivent être mis en service ensemble :

Les deux fonctions Edge utilisent `verify_jwt = false` au niveau de la passerelle ; chaque fonction valide elle-même le jeton avec `auth.getUser` et exige une appartenance admin active via `requireActiveAdmin`. Cette vérification applicative est obligatoire et ne doit pas être retirée.

```sh
supabase functions deploy admin-create-user --project-ref otaodwohbksacvbheshd
supabase functions deploy admin-organizations --project-ref otaodwohbksacvbheshd
supabase secrets set APP_ORIGINS="http://127.0.0.1:4173,http://localhost:4173" --project-ref otaodwohbksacvbheshd
```

Ajouter aussi les URL locales et l’URL de l’application déployée à la liste **Auth → URL Configuration → Redirect URLs**. Pour une URL de production, l’ajouter également à `APP_ORIGINS`. Les identifiants `SUPABASE_SERVICE_ROLE_KEY` doivent rester dans l’environnement serveur Supabase ; ne jamais les ajouter au navigateur ni à Vercel côté client.

## Références

- reference/ : V16 inchangée et empreinte SHA-256.
- .agents/skills/ : les cinq skills fournis par le propriétaire.
- docs/VALIDATION.md : contrôles et limites.

La configuration Git locale pointe vers chekirBrahim/Fruidges. Aucun push ni déploiement Vercel effectué à ce stade.

## Mise à jour du 20 novembre 2026

supabase/01-access.sql et `supabase/02-catalog.sql` ont été appliqués avec accord du propriétaire. La création de comptes par formulaire génère un lien d’activation manuel ; aucun e-mail n’est envoyé automatiquement. La fonction Edge n’est pas encore déployée et aucun compte/lien n’a été créé par cette interface.

## Isolation des entreprises et des catalogues

Les offres fournisseur (`source`) sont visibles aux acheteurs/grossistes lorsqu’elles sont publiées. Un acheteur/grossiste gère ses propres offres `resale`, que les restaurants voient uniquement après publication. Les offres existantes sans canal restent visibles à leur propriétaire et à l’admin ; leur classification exige une décision explicite. Voir `docs/ISOLATION-2026-11-20.md` et `docs/VALIDATION.md` pour les limites et tests locaux.
