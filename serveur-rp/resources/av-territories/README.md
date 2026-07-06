# av-territories

Le script signature du serveur : **territoires de gangs** avec influence, contrôle, revenus passifs et guerres encadrées.

## Comment ça marche

1. **Influence par présence** : toutes les 60 s, chaque membre de gang présent dans une zone fait gagner de l'influence à son gang dans cette zone.
2. **Contrôle** : le gang qui dépasse le seuil (`Config.ControlThreshold`) prend une zone neutre. Pour ravir une zone tenue, il faut dépasser l'influence du gang en place de +50 % (`Config.TakeoverRatio`) — ou gagner une **guerre**.
3. **Revenus** : toutes les 30 min, la zone verse son revenu ($ sale) au gang qui la contrôle (si au moins un membre est en ligne).
4. **Guerres** : `/guerre` depuis la zone visée, uniquement en soirée (19h-23h), coût de déclaration, fenêtre de 60 min pendant laquelle l'influence gagnée compte x5, puis cooldown de 48 h.
5. **Décroissance** : -5 % d'influence par jour → les gangs inactifs perdent leur emprise.

## Installation

1. Importer `sql/territories.sql` dans la base QBCore.
2. Placer le dossier dans `resources/[custom]/av-territories`.
3. `ensure av-territories` (déjà couvert par `ensure [custom]` dans notre server.cfg).

## Points d'intégration à brancher (TODO)

- **Trésorerie de gang** : les versements et le coût de déclaration de guerre sont journalisés en base (`av_territory_payouts`) mais le débit/crédit réel dépend du système de gestion choisi (`qb-management`, `renewed-banking`…). Chercher les commentaires `Point d'intégration` dans `server/main.lua`.
- **Anti-abus** : coupler le gain d'influence à une activité réelle (ventes de drogue dans la zone, etc.) plutôt qu'à la simple présence AFK — prévu en v2.
- **Site web** : la table `av_territory_payouts` + `av_territories` alimenteront la carte des territoires en temps réel du site.

## Commandes

| Commande | Qui | Effet |
|----------|-----|-------|
| `/territoire` | tous | Infos sur la zone où l'on se trouve |
| `/guerre` | membres de gang | Déclare la guerre pour la zone où l'on se trouve |
