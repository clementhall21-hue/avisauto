-- ============================================================
-- av-territories / serveur
-- Influence par présence, contrôle des zones, revenus, guerres.
-- Framework : QBCore. Persistance : oxmysql (sql/territories.sql).
-- ============================================================

local QBCore = exports['qb-core']:GetCoreObject()

-- État en mémoire, chargé depuis la base au démarrage.
-- territories[zoneId] = { owner = 'gangname'|nil, influence = { [gang] = n }, war = nil|{...} }
local territories = {}

-- ------------------------------------------------------------
-- Chargement / persistance
-- ------------------------------------------------------------

local function loadTerritories()
    for _, zone in ipairs(Config.Zones) do
        territories[zone.id] = { owner = nil, influence = {}, war = nil }
    end

    local rows = MySQL.query.await('SELECT * FROM av_territories') or {}
    for _, row in ipairs(rows) do
        if territories[row.zone_id] then
            territories[row.zone_id].owner = row.owner_gang
            territories[row.zone_id].influence = json.decode(row.influence or '{}') or {}
        end
    end
    print(('[av-territories] %d zones chargées'):format(#Config.Zones))
end

local function saveTerritory(zoneId)
    local t = territories[zoneId]
    MySQL.query(
        'INSERT INTO av_territories (zone_id, owner_gang, influence) VALUES (?, ?, ?) ' ..
        'ON DUPLICATE KEY UPDATE owner_gang = VALUES(owner_gang), influence = VALUES(influence)',
        { zoneId, t.owner, json.encode(t.influence) }
    )
end

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

local function getZoneConfig(zoneId)
    for _, zone in ipairs(Config.Zones) do
        if zone.id == zoneId then return zone end
    end
end

local function getPlayerGang(src)
    local player = QBCore.Functions.GetPlayer(src)
    if not player then return nil end
    local gang = player.PlayerData.gang
    if gang and gang.name and gang.name ~= 'none' then return gang.name end
    return nil
end

-- Membres de gang en ligne, groupés par gang et par zone
local function getGangPresenceByZone()
    local presence = {}  -- presence[zoneId][gang] = count
    for _, src in ipairs(QBCore.Functions.GetPlayers()) do
        local gang = getPlayerGang(src)
        if gang then
            local ped = GetPlayerPed(src)
            local coords = GetEntityCoords(ped)
            for _, zone in ipairs(Config.Zones) do
                if #(coords - zone.center) <= zone.radius then
                    presence[zone.id] = presence[zone.id] or {}
                    presence[zone.id][gang] = (presence[zone.id][gang] or 0) + 1
                end
            end
        end
    end
    return presence
end

local function broadcastState()
    local state = {}
    for zoneId, t in pairs(territories) do
        state[zoneId] = { owner = t.owner, war = t.war ~= nil }
    end
    TriggerClientEvent('av-territories:client:syncState', -1, state)
end

-- ------------------------------------------------------------
-- Cœur : tick d'influence + résolution du contrôle
-- ------------------------------------------------------------

local function resolveControl(zoneId)
    local t = territories[zoneId]
    local topGang, topScore = nil, 0
    for gang, score in pairs(t.influence) do
        if score > topScore then topGang, topScore = gang, score end
    end
    if not topGang or topScore < Config.ControlThreshold then return end

    if t.owner == nil then
        t.owner = topGang
        saveTerritory(zoneId)
        broadcastState()
        TriggerEvent('av-territories:zoneCaptured', zoneId, topGang)
    elseif topGang ~= t.owner then
        local ownerScore = t.influence[t.owner] or 0
        local ratio = t.war and 1.0 or Config.TakeoverRatio
        if topScore >= ownerScore * ratio then
            local previous = t.owner
            t.owner = topGang
            saveTerritory(zoneId)
            broadcastState()
            TriggerEvent('av-territories:zoneCaptured', zoneId, topGang, previous)
        end
    end
end

CreateThread(function()
    loadTerritories()
    broadcastState()

    while true do
        Wait(Config.InfluenceTickInterval * 1000)
        local presence = getGangPresenceByZone()
        for zoneId, gangs in pairs(presence) do
            local t = territories[zoneId]
            local mult = t.war and Config.War.influenceMultiplier or 1
            for gang, count in pairs(gangs) do
                local gain = count * Config.InfluencePerMemberPerTick * mult
                t.influence[gang] = (t.influence[gang] or 0) + gain
            end
            resolveControl(zoneId)
            saveTerritory(zoneId)
        end
    end
end)

-- ------------------------------------------------------------
-- Revenus de territoire
-- ------------------------------------------------------------

CreateThread(function()
    while true do
        Wait(Config.PayoutInterval * 1000)
        for zoneId, t in pairs(territories) do
            if t.owner then
                local zone = getZoneConfig(zoneId)
                local eligible = true
                if Config.PayoutOnlyIfMemberOnline then
                    eligible = false
                    for _, src in ipairs(QBCore.Functions.GetPlayers()) do
                        if getPlayerGang(src) == t.owner then eligible = true break end
                    end
                end
                if eligible and zone then
                    -- Point d'intégration : verser dans la trésorerie du gang.
                    -- Selon le système de gestion choisi (qb-management, renewed-banking…) :
                    -- exports['qb-management']:AddGangMoney(t.owner, zone.income)
                    MySQL.query(
                        'INSERT INTO av_territory_payouts (zone_id, gang, amount) VALUES (?, ?, ?)',
                        { zoneId, t.owner, zone.income }
                    )
                    TriggerEvent('av-territories:payout', zoneId, t.owner, zone.income)
                end
            end
        end
    end
end)

-- ------------------------------------------------------------
-- Décroissance quotidienne (les gangs inactifs perdent leur emprise)
-- ------------------------------------------------------------

CreateThread(function()
    while true do
        Wait(24 * 3600 * 1000)
        for zoneId, t in pairs(territories) do
            for gang, score in pairs(t.influence) do
                t.influence[gang] = math.floor(score * (1 - Config.DailyDecayPercent / 100))
            end
            saveTerritory(zoneId)
        end
    end
end)

-- ------------------------------------------------------------
-- Guerres de territoire
-- ------------------------------------------------------------

local warCooldowns = {}  -- warCooldowns[zoneId] = timestamp de fin de cooldown

RegisterNetEvent('av-territories:server:declareWar', function(zoneId)
    local src = source
    local gang = getPlayerGang(src)
    local t = territories[zoneId]
    local zone = getZoneConfig(zoneId)
    if not gang or not t or not zone then return end

    if not t.owner or t.owner == gang then
        TriggerClientEvent('QBCore:Notify', src, 'Zone invalide pour une guerre.', 'error')
        return
    end
    if t.war then
        TriggerClientEvent('QBCore:Notify', src, 'Une guerre est déjà en cours ici.', 'error')
        return
    end
    if warCooldowns[zoneId] and os.time() < warCooldowns[zoneId] then
        TriggerClientEvent('QBCore:Notify', src, 'Cette zone est encore sous cooldown de guerre.', 'error')
        return
    end
    local hour = tonumber(os.date('%H'))
    if hour < Config.War.allowedHours.min or hour >= Config.War.allowedHours.max then
        TriggerClientEvent('QBCore:Notify', src,
            ('Les guerres ne peuvent être déclarées qu\'entre %dh et %dh.')
            :format(Config.War.allowedHours.min, Config.War.allowedHours.max), 'error')
        return
    end

    -- Point d'intégration : débiter Config.War.declarationCost de la trésorerie du gang.
    -- if not exports['qb-management']:RemoveGangMoney(gang, Config.War.declarationCost) then ... end

    t.war = { attacker = gang, startedAt = os.time() }
    warCooldowns[zoneId] = os.time() + Config.War.cooldownHours * 3600
    broadcastState()
    TriggerClientEvent('QBCore:Notify', -1,
        ('⚔️ GUERRE : %s attaque %s pour le contrôle de %s !'):format(gang, t.owner, zone.label), 'error', 10000)

    SetTimeout(Config.War.durationMinutes * 60 * 1000, function()
        if territories[zoneId].war then
            territories[zoneId].war = nil
            broadcastState()
            local owner = territories[zoneId].owner
            TriggerClientEvent('QBCore:Notify', -1,
                ('La guerre pour %s est terminée. Contrôle : %s.'):format(zone.label, owner or 'personne'), 'primary', 10000)
        end
    end)
end)

-- ------------------------------------------------------------
-- Sync à la connexion + commande d'info
-- ------------------------------------------------------------

RegisterNetEvent('av-territories:server:requestState', function()
    local src = source
    local state = {}
    for zoneId, t in pairs(territories) do
        state[zoneId] = { owner = t.owner, war = t.war ~= nil }
    end
    TriggerClientEvent('av-territories:client:syncState', src, state)
end)

QBCore.Commands.Add('territoire', 'Infos sur la zone où vous êtes', {}, false, function(source)
    local ped = GetPlayerPed(source)
    local coords = GetEntityCoords(ped)
    for _, zone in ipairs(Config.Zones) do
        if #(coords - zone.center) <= zone.radius then
            local t = territories[zone.id]
            local msg = ('%s — contrôlée par : %s%s'):format(
                zone.label, t.owner or 'personne',
                t.war and ' (GUERRE EN COURS)' or '')
            TriggerClientEvent('QBCore:Notify', source, msg, 'primary', 7500)
            return
        end
    end
    TriggerClientEvent('QBCore:Notify', source, 'Vous n\'êtes dans aucun territoire.', 'error')
end)
