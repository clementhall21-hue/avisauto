# 🌆 Projet Serveur RP — Crime Organisé

Serveur FiveM (GTA 5) orienté **crime organisé** : gangs, territoires, guerres de factions, économie souterraine. Conçu dès le départ pour migrer vers GTA 6 quand l'écosystème s'ouvrira (post-novembre 2026).

## Vision

> Le serveur où le crime a des conséquences. Territoires à conquérir, alliances fragiles, trahisons mémorables — le contenu que les streamers veulent jouer et que les viewers veulent regarder.

**Positionnement** : ni un serveur "ville tranquille" de plus, ni du deathmatch déguisé. Du RP criminel structuré, avec des mécaniques custom qu'on ne trouve nulle part ailleurs.

## Structure du projet

```
serveur-rp/
├── docs/            Stratégie, concept, économie, monétisation, roadmap
├── server/          Configuration du serveur FiveM (server.cfg, docker, .env)
└── resources/       Scripts custom (notre différenciation technique)
    └── av-territories/   Système de territoires de gangs (script signature)
```

## Stack technique

| Composant | Choix | Pourquoi |
|-----------|-------|----------|
| Plateforme | FiveM (FXServer + txAdmin) | Le standard du RP GTA, soutenu par Rockstar |
| Framework | QBCore | Communauté active, riche en mécaniques crime, plus moderne qu'ESX |
| Base de données | MariaDB (via Docker) | Standard FiveM, oxmysql |
| Scripts custom | Lua (+ JS si besoin) | Langage natif FiveM |
| Monétisation | Tebex | Seule plateforme autorisée par les règles FiveM |

## Démarrage rapide (serveur de dev local)

1. **Prérequis** : un serveur Linux (ou machine locale), Docker, et une clé de licence gratuite sur [keymaster.fivem.net](https://keymaster.fivem.net)

2. **Base de données** :
   ```bash
   cd server
   cp .env.example .env   # puis éditer les mots de passe
   docker compose up -d
   ```

3. **FXServer + txAdmin** :
   ```bash
   mkdir -p ~/fxserver && cd ~/fxserver
   # Télécharger le dernier artifact Linux : https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/
   wget <url_du_dernier_artifact> -O fx.tar.xz && tar xf fx.tar.xz
   ./run.sh   # lance txAdmin → suivre l'assistant web (port 40120)
   ```
   Dans l'assistant txAdmin, choisir le template **QBCore**, puis remplacer le `server.cfg` généré par celui de `server/server.cfg`.

4. **Ressources custom** : copier (ou symlink) le contenu de `resources/` dans le dossier `resources/[custom]/` du serveur, et importer les fichiers `sql/` de chaque ressource dans la base.

## Documents clés

- [`docs/CONCEPT.md`](docs/CONCEPT.md) — le concept crime organisé en détail
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — les phases, de zéro jusqu'à la migration GTA 6
- [`docs/ECONOMIE.md`](docs/ECONOMIE.md) — les règles de l'économie du serveur
- [`docs/MONETISATION.md`](docs/MONETISATION.md) — comment gagner de l'argent sans tuer le serveur
- [`docs/STREAMERS.md`](docs/STREAMERS.md) — le playbook pour attirer les streamers (le nerf de la guerre)
