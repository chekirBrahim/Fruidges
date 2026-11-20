# Matrice de référence — à confronter au projet

Les droits ci-dessous sont des hypothèses conservatrices de travail, pas une preuve du schéma de production. Résoudre les divergences métier avant de modifier les accès réels. Une organisation multi-utilisateurs exige des appartenances vérifiées, pas seulement un rôle global.

| Acteur | Catalogue | Panier et commandes | Administration |
|---|---|---|---|
| Anonyme | Produits publics seulement si déjà prévus | Aucun accès aux commandes privées | Aucun |
| Fournisseur | Gérer/importer ses propres produits et photos | Lire ses lignes de commande et effectuer seulement ses transitions autorisées | Ni autres fournisseurs ni rôles |
| Acheteur | Lire les offres visibles pour son compte | Gérer son panier, créer/lire ses commandes, annuler selon état | Aucun |
| Grossiste | Même base acheteur, conditions commerciales existantes | Ses commandes ; aucun droit fournisseur implicite | Aucun |
| Restaurant | Même base acheteur, conditions commerciales existantes | Ses commandes uniquement | Aucun |
| Admin | Gestion étendue explicitement prévue | Gestion autorisée et auditée | Attribution des rôles depuis un circuit serveur protégé |

## Vérifications par ressource
- Profils : limiter les champs modifiables ; rôle, organisation et état de validation ne sont pas librement éditables.
- Produits : lecture selon visibilité, écriture propriétaire ; changer supplier_id ne permet pas de transférer un produit arbitrairement.
- Paniers : propriétaire seulement, y compris éléments enfants ; prix affiché non fiable pour le calcul serveur.
- Commandes/lignes : acheteur propriétaire, fournisseur seulement ses lignes et informations nécessaires, admin autorisé. Ne pas exposer les autres fournisseurs d’une commande groupée.
- Stocks : mises à jour par mécanisme transactionnel autorisé ; pas d’écriture directe depuis un acheteur.
- Bons et photos privées : vérifier accès aux objets Storage et durée des liens signés ; un dossier nommé avec un user_id ne constitue pas une politique.
- Logs : accès restreint, pas de jetons ni de contenu complet de messages privés.

## Cas négatifs essentiels
Utilisateur A lit/modifie la commande B ; fournisseur A modifie produit B ; inscription avec rôle admin ; mise à jour de son propre rôle ; requête anonyme ; jeton expiré ; accès direct à un bon privé ; fonction privilégiée appelée sans droits ; fournisseur lisant les lignes d’un concurrent. Tous doivent être refusés, sans empêcher les cas légitimes correspondants.
