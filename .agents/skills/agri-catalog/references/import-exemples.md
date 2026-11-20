# Contrat de démonstration et dix exemples

Ces dix lignes sont entièrement fictives. Prix, stocks, origines et traductions sont des données de test, à ne pas publier comme offres réelles. Aucun taux de change n’est fourni. Les prix KWD ne sont pas des conversions des prix USD. Destination CIF fictive commune : DEMO-PORT ; à remplacer par une destination réellement validée.

Il s’agit d’un modèle tabulaire à reproduire dans Excel pour tester l’import, pas du classeur original. Le fournisseur de test vient de la session et non d’une colonne. Photo absente volontairement : afficher l’état sans photo. Le stock représente ici des cartons disponibles sans réservation ; adapter explicitement au modèle réel.

| sku | name_en | name_ar | origin_country | kg_per_carton | stock_cartons | cif_price_carton | currency | cif_destination | ignore_1 | ignore_2 | ignore_3 |
|---|---|---|---|---:|---:|---:|---|---|---|---|---|
| DEMO-001 | Tomatoes | طماطم | TN | 5 | 100 | 12.50 | USD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-002 | Potatoes | بطاطس | EG | 10 | 80 | 3.750 | KWD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-003 | Oranges | برتقال | MA | 8 | 60 | 14.00 | USD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-004 | Dates | تمر | TN | 5 | 40 | 8.250 | KWD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-005 | Onions | بصل | IN | 10 | 120 | 10.00 | USD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-006 | Apples | تفاح | TR | 6 | 50 | 4.500 | KWD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-007 | Bananas | موز | EC | 12 | 30 | 18.00 | USD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-008 | Cucumbers | خيار | JO | 5 | 0 | 2.250 | KWD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-009 | Carrots | جزر | EG | 10 | 70 | 11.50 | USD | DEMO-PORT | DEMO-X | 999999 | admin |
| DEMO-010 | Lemons | ليمون | TR | 7 | 25 | 3.850 | KWD | DEMO-PORT | DEMO-X | 999999 | admin |

## Résultat attendu
12 colonnes de table, 9 conservées, 3 exclues par position. 10 produits de démonstration ; DEMO-008 indisponible à la commande. `ignore_1`, `ignore_2`, `ignore_3` ne doivent alimenter aucun champ produit, stock ou rôle. Ne pas journaliser leurs valeurs dans un import réel.
DEMO-001 : 12.50 USD/carton de 5 kg → 2.50 USD/kg. DEMO-002 : 3.750 KWD/carton de 10 kg → 0.375 KWD/kg. Ces calculs n’impliquent aucune conversion monétaire.
Un second import identique ne crée aucun doublon. Une ligne avec stock −1, poids 0, devise inconnue ou prix absent est rejetée. Ajouter une colonne vide uniquement formatée après ignore_3 ne change pas l’exclusion. Une ligne avec ses trois dernières cellules vides conserve les mêmes positions exclues que les autres lignes.
