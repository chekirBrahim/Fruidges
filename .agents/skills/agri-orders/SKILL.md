---
name: agri-orders
description: "Développer les parcours AGRI CONNECT de panier, commandes, réservation de stock, bons Word et partage WhatsApp avec contrôle des permissions."
---

# Panier, stock et commandes

Lire AGENTS.md et les règles métier existantes. Ne pas introduire de paiement ou de nouveau statut contractuel sans besoin explicite.

## Parcours transactionnel
1. Préserver le parcours catalogue → quantité +/− → panier → récapitulatif → commande → bon Word → partage WhatsApp. Garder la langue, le pays, le fournisseur et la devise cohérents ; ne jamais vider silencieusement le panier.
2. Afficher pour chaque ligne produit, origine, fournisseur, cartons, kg/carton, quantité, prix CIF/carton, prix/kg si calculable, devise, destination CIF connue et disponibilité. Séparer les totaux par devise ; conversion uniquement avec source et taux daté. Conserver la stratégie existante pour commandes multi-fournisseurs ; chaque fournisseur ne doit voir que ses lignes.
3. Recalculer montants, permissions et stock côté serveur. Revalider un prix périmé et demander au client d’accepter le nouveau total avant confirmation. Photographier les valeurs commerciales dans les lignes de commande pour que les anciennes commandes ne changent pas avec le catalogue.
4. Réserver ou décrémenter le stock et créer la commande dans une transaction atomique avec protection contre concurrence. Définir un seul moment de mouvement de stock selon les états existants. Utiliser une clé d’idempotence pour double clic/retry ; une commande ne doit retirer le stock qu’une fois. Un rollback ne doit laisser ni réservation orpheline ni commande partielle.
5. Appliquer les transitions de statut côté serveur selon les rôles. Une annulation libère une réservation une seule fois selon l’état ; ne jamais remettre automatiquement du stock déjà expédié. Auditer transitions et erreurs sans secrets ni données personnelles inutiles.

## Bons Word et WhatsApp
- Générer un vrai `.docx` à partir de la commande persistée : référence, date, parties autorisées, lignes, origine, cartons, poids, prix, devise, totaux, conditions CIF connues et statut. Anglais ou arabe avec direction et tableaux adaptés. En prototype, marquer DÉMONSTRATION / NON CONTRACTUEL. Ne pas inventer coordonnées légales, taxes, signature ou paiement.
- Vérifier ouverture du document, lisibilité et concordance avec les totaux serveur. Restreindre génération et téléchargement aux parties autorisées ; pas d’URL publique permanente pour un bon privé.
- Préparer le message WhatsApp avec destinataire vérifié, langue choisie et récapitulatif minimal. Un lien de conversation prérempli prépare un message, il ne prouve pas son envoi et ne joint pas automatiquement un fichier Word. Prévoir téléchargement puis pièce jointe manuelle ou intégration autorisée avec preuve d’envoi.
- Envoyer uniquement si l’utilisateur l’a explicitement autorisé pour le destinataire et le contenu concernés. Ne pas exposer de jeton ou lien privé durable dans le message. Toute URL partagée doit respecter l’accès prévu et une durée limitée.

## Validation
Tester stock zéro, dépassement, deux acheteurs sur le dernier carton, double soumission, échec transactionnel, prix modifié, annulation répétée, totaux USD/KWD, bon AR et accès à la commande d’un autre client. Vérifier le parcours fournisseur et chaque catégorie d’acheteur. Rapporter séparément commande créée, document généré, message préparé et message réellement envoyé.
