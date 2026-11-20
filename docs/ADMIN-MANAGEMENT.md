# Administration — mise à jour locale

Ajout : liste paginée des comptes (50/page), recherche e-mail/entreprise, filtres de statut, vue des comptes en attente, activation et suspension. EN/AR. Les comptes administrateurs sont protégés contre les changements de statut depuis cette interface. Le formulaire de création et les annuaires entreprises existants sont conservés.

Appliquer manuellement les scripts séparément, avec vérification entre chacun : 08-admin-list-users.sql pour la lecture, puis 09-admin-user-status.sql pour les transitions. Aucun script n’a été exécuté à distance par l’agent. Redémarrer npm run dev après application. Aucun nouveau déploiement Edge Function nécessaire pour ces deux RPC.

Les RPC vérifient auth.uid() et une appartenance admin active ; aucun identifiant d’administrateur n’est accepté depuis le navigateur. Les tests PostgreSQL isolés couvrent autorisation, refus non-admin/anonyme/admin suspendu, recherche, transitions et protection des admins. npm test et build réussissent. La recette visuelle et la validation Supabase réelle restent à effectuer.

La vue « demandes » correspond aux appartenances pending existantes, pas à un formulaire public de demande d’accès. La suspension retire les droits métier via RLS ; elle ne supprime pas le compte Auth. Les liens image déjà signés restent valides jusqu’à leur expiration.

La page administrateur n’est pas encore complète au sens métier : commandes et statistiques commerciales dépendent du module commandes, encore non connecté. Les compteurs actuels concernent uniquement le catalogue chargé. Aucun chiffre de vente fictif n’est affiché.
