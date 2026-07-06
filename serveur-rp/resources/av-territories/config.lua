Config = {}

-- ============================================================
-- av-territories — configuration
-- Toutes les durées sont en secondes, tous les montants en $ sale.
-- ============================================================

-- Fréquence du tick d'influence (présence des membres de gang en zone)
Config.InfluenceTickInterval = 60

-- Influence gagnée par membre de gang présent dans la zone, par tick
Config.InfluencePerMemberPerTick = 1

-- Influence minimale pour prendre le contrôle d'une zone neutre
Config.ControlThreshold = 100

-- Pour ravir une zone contrôlée hors guerre : il faut dépasser
-- l'influence du gang en place de ce ratio (1.5 = +50 %)
Config.TakeoverRatio = 1.5

-- Décroissance : % d'influence perdue par jour sans présence
-- (empêche les gangs inactifs de garder leurs zones éternellement)
Config.DailyDecayPercent = 5

-- Versement des revenus de territoire
Config.PayoutInterval = 1800        -- toutes les 30 min
Config.PayoutOnlyIfMemberOnline = true

-- Guerres de territoire (fenêtres encadrées pour éviter le chaos 24/7)
Config.War = {
    declarationCost = 25000,        -- coût de déclaration (trésorerie du gang)
    durationMinutes = 60,           -- durée de la fenêtre de guerre
    cooldownHours = 48,             -- délai avant de pouvoir redéclarer sur la même zone
    influenceMultiplier = 5,        -- l'influence gagnée pendant une guerre compte x5
    allowedHours = { min = 19, max = 23 },  -- heure serveur : guerres uniquement en soirée
}

-- Les zones contrôlables.
-- blip : icône sur la carte ; income : $ sale par payout au gang contrôleur.
Config.Zones = {
    {
        id = 'docks',
        label = 'Les Docks',
        center = vector3(1208.0, -2954.0, 5.9),
        radius = 220.0,
        income = 3000,
        blipSprite = 501,
    },
    {
        id = 'grove',
        label = 'Grove Street',
        center = vector3(107.0, -1938.0, 20.8),
        radius = 180.0,
        income = 2500,
        blipSprite = 501,
    },
    {
        id = 'industrial',
        label = 'Zone Industrielle El Burro',
        center = vector3(1370.0, -2088.0, 51.9),
        radius = 200.0,
        income = 2000,
        blipSprite = 501,
    },
}

-- Couleur des blips par état
Config.BlipColors = {
    neutral = 0,     -- blanc
    owned = 1,       -- rouge (contrôlée par un gang)
    yours = 2,       -- vert (contrôlée par VOTRE gang)
    war = 17,        -- orange (guerre en cours)
}
