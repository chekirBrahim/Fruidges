# Images produit

Champ facultatif EN/AR : JPEG, PNG, WebP, 5 MiB maximum. Appliquer une fois `supabase/05-product-images.sql` dans Supabase, puis redémarrer `npm run dev`. Aucun déploiement Edge Function nécessaire.

Le bucket est privé. Les politiques autorisent l’écriture aux vendeurs actifs dans leur entreprise, et la lecture via les produits visibles sous RLS ou les fichiers de leur entreprise. Les URL signées expirent après dix minutes ; actualiser le catalogue pour les renouveler. Elles restent utilisables jusqu’à expiration même après une révocation de rôle.

L’image est envoyée avant la création du produit. Un échec de transfert empêche la création du produit. Si le transfert réussit mais que l’enregistrement du produit échoue ou que la session change, un fichier non rattaché peut rester dans Storage ; aucune suppression automatique risquant d’effacer une image liée après un timeout ambigu. Ces fichiers nécessitent un nettoyage administratif après vérification.

Validation locale : types, taille, échec de transfert et conservation du catalogue si une image ne peut être chargée. Les contrôles bucket de taille/type sont configurés côté serveur, mais ne constituent pas une analyse antivirus. La migration Storage et les parcours réels doivent encore être vérifiés sur Supabase : ajout avec/sans image, rechargement, refus d’écriture interentreprises, visibilité acheteur/restaurant.
