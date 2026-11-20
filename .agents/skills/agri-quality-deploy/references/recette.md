# Recette AGRI CONNECT

Utiliser une base de test isolée et des comptes fictifs pour chaque rôle. Les scénarios décrivent des résultats attendus, pas des tests déjà exécutés. Adapter les chemins et sélecteurs au dépôt.

| Domaine | Scénario | Résultat vérifiable |
|---|---|---|
| V14 | Comparer écrans de référence mobile/bureau | Design et fonctions conservés ; écarts demandés identifiés |
| Navigation | Ouvrir chaque carte/drapeau puis revenir | Destination, filtres et sélection cohérents |
| Langues | Basculer EN → AR avec panier rempli | RTL et textes complets, panier inchangé, SKU lisibles |
| Quantités | +/−, saisie invalide, zéro stock, maximum | Bornes cohérentes, pas de quantité négative ou dépassement |
| Catalogue | Importer les 10 exemples | 10 lignes, 3 colonnes ignorées, aucun droit admin créé |
| Import | Réimport, doublons, ligne invalide | Pas de duplication ou écrasement d’un autre fournisseur |
| Prix | USD, KWD, poids/carton, CIF | Précision correcte, prix/kg exact, devises séparées |
| Auth | Chaque rôle, déconnexion, expiration | Accès autorisé correct et session terminée correctement |
| RLS | Accès direct croisé et élévation de rôle | Refus serveur, y compris commandes et fichiers |
| Commande | Deux clients achètent le dernier carton | Une seule réservation, jamais stock négatif |
| Commande | Double clic et retry réseau | Une commande et un seul mouvement de stock |
| Commande | Prix modifié et échec transactionnel | Reconfirmation du prix ; aucun état partiel |
| Annulation | Répéter l’annulation | Une seule libération si permise par le statut |
| Word | Télécharger bon EN/AR autorisé | DOCX lisible, totaux et direction corrects |
| WhatsApp | Préparer un partage sans envoyer | Bon destinataire et texte ; aucun envoi prétendu |
| Vercel | Tester preview autorisée | Routes profondes, auth, catalogue, panier fonctionnels |

Consigner pour chaque scénario : environnement, rôle, résultat, preuve et limite. Exécuter les tests de concurrence/RLS au niveau intégration ; Playwright seul avec API simulée ne prouve pas ces garanties. Ne pas enregistrer des mots de passe, jetons ou données réelles dans les rapports. Après production, limiter la recette à des vérifications non destructives sauf autorisation explicite de transactions de test.
