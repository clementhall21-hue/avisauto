# Concept — Crime Organisé

## Le pitch

Une ville où le pouvoir se prend et se garde. Les gangs contrôlent des **territoires** qui rapportent de l'argent et des avantages réels. Les alliances se font au sommet, les trahisons se paient dans la rue. Le staff n'écrit pas l'histoire : il pose le décor, les joueurs écrivent le reste.

## Les 4 piliers

### 1. Les territoires (notre mécanique signature)

- La carte est découpée en zones contrôlables (docks, quartiers, zones industrielles).
- Contrôler une zone = revenus passifs + avantages (prix réduits au marché noir local, points de vente de drogue exclusifs, planques).
- Le contrôle se prend par **influence** : présence, activités criminelles dans la zone, et guerres déclarées (fenêtres horaires encadrées pour éviter le chaos permanent).
- Tout est visible : une carte des territoires en jeu et sur le site web → les viewers Twitch suivent la "géopolitique" du serveur comme une série.

**→ Implémenté dans `resources/av-territories/`**

### 2. L'économie souterraine

- Chaînes de production complètes (culture → transformation → vente) avec des maillons situés dans des territoires : contrôler la zone, c'est contrôler le business.
- Le blanchiment est une mécanique, pas un bouton : l'argent sale doit passer par des commerces de façade tenus par des joueurs.
- L'argent est rare (voir `ECONOMIE.md`) : perdre une guerre de territoire fait vraiment mal.

### 3. Les factions structurées

- Gangs créés par les joueurs avec hiérarchie, trésorerie commune, réputation.
- Un nombre limité de "grandes familles" whitelistées avec des avantages narratifs → les places se méritent, l'ascension est un objectif de jeu.
- La police est une faction puissante et bien staffée : sans opposition crédible, le crime RP s'effondre.

### 4. Les moments spectaculaires

- Braquages custom à plusieurs phases (repérage, matériel, exécution, fuite, blanchiment).
- Événements serveur : arrivée d'un cartel PNJ scénarisé, saisie policière massive, guerre ouverte déclarée.
- Tout est pensé "clippable" : si un moment ne peut pas devenir un clip Twitch, il manque quelque chose.

## Ce qu'on refuse (aussi important que le reste)

- **Pas de deathmatch** : tuer sans raison RP = sanction. Le gunfight est la fin d'une histoire, pas le gameplay.
- **Pas de pay-to-win** : l'argent réel n'achète jamais de la puissance en jeu (voir `MONETISATION.md`).
- **Pas de favoritisme staff** : les modos ne jouent pas dans les factions qu'ils modèrent.

## Public cible

- **Joueurs** : 16-30 ans, francophones, fans de RP crime (le public NoPixel/FlashLand qui cherche plus de profondeur côté gangs).
- **Streamers** : créateurs FR en croissance (500-5000 viewers) qui veulent du contenu narratif fort sans la file d'attente des serveurs saturés.
