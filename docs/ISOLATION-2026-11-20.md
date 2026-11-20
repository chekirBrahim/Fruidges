# Corrections locales — 20 novembre 2026

Statut : code et migration préparés, aucune application distante dans cette étape.

## Comptes et entreprises

L’administrateur doit renseigner soit un nom de nouvelle entreprise, soit l’UUID d’une entreprise existante. Le serveur vérifie à nouveau ses droits. Une fonction SQL réservée au service serveur crée l’entreprise et l’appartenance dans une transaction ; un échec annule les deux. Aucune appartenance existante n’est remplacée. Les entreprises précédemment partagées ne sont pas automatiquement corrigées : un audit des utilisateurs et des produits est nécessaire.

Auth et PostgreSQL ne partagent pas de transaction. Si la création Auth réussit et que l’appartenance échoue, le compte reste sans accès métier. Il faut examiner ce compte dans Supabase et terminer son rattachement explicitement avant de générer un nouveau lien. Ne pas supprimer automatiquement un utilisateur : une invitation peut concerner une identité déjà présente. Le lien n’est retourné que lorsque l’appartenance est créée.

## Catalogue

- Fournisseur : écrit ses offres `source` ; consulte ses produits et les offres source publiées.
- Acheteur/grossiste : consulte les offres source publiées ; écrit et publie ses propres offres `resale`.
- Restaurant : consulte uniquement les offres resale publiées.
- Admin actif : consulte et gère les produits, choisit le public lors de la création.
- Anonyme ou compte suspendu : aucun accès au catalogue.

Un acheteur ne voit pas un brouillon fournisseur : la source doit être `published` et avoir le canal `source`. De même, un restaurant ne voit une offre `resale` qu’après publication. Les anciennes offres avec canal NULL restent visibles à leur propriétaire et à l’administrateur ; leur classification n’est pas devinée.

Le contrôle en lecture seule `supabase/06-buyer-wholesaler-preflight.sql` vérifie les rôles, les statuts/canaux produits et les politiques présentes. La migration préparée `supabase/06-buyer-wholesaler-role.sql` convertit les appartenances `wholesaler` existantes en `buyer`, réduit la liste des rôles à quatre, et remplace les politiques catalogue. Elle préserve l’accès propriétaire aux offres héritées NULL et adapte les politiques d’images si le bucket existe. Elle n’a pas été appliquée sur Supabase. L’application normalise temporairement les comptes historiques `wholesaler` en acheteurs à la connexion, mais les nouveaux acheteurs ne peuvent gérer les offres `resale` qu’après application de la migration.

## Validation et mise en service

`npm test` réussit, y compris les tests SQL dans PostgreSQL embarqué PGlite : accès autorisés, refus interentreprises, usurpation de canal et d’organisation, suspension, appel RPC interdit au navigateur, provisioning distinct et rollback. Ces tests utilisent des identités simulées dans une base isolée, pas de vrais JWT Supabase.

Avant mise en service : exécuter `supabase/06-buyer-wholesaler-preflight.sql`, sauvegarder les tables concernées, confirmer que la migration 03 (ou ses politiques équivalentes) est déjà présente, puis appliquer manuellement `supabase/06-buyer-wholesaler-role.sql`. Déployer la fonction `admin-create-user` et le frontend compatibles, puis vérifier chaque rôle avec de vrais comptes de test et JWT sur Supabase. Une migration échouée est annulée par sa transaction.

Après une migration réussie, privilégier une correction en avant. Restaurer les anciennes politiques réintroduirait les défauts de confidentialité ; ne pas le faire comme rollback automatique. La colonne additive peut rester en place en cas de retrait du frontend. Garder la création de comptes indisponible plutôt que réactiver l’ancien rattachement automatique.

Restent à valider : Auth hébergé, livraison et expiration des liens, parcours visuel EN/AR et tests API multiutilisateurs réels. Aucun déploiement GitHub, Vercel ou Supabase n’est attesté par ces tests locaux.
