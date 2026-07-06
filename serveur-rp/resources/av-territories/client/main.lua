-- ============================================================
-- av-territories / client
-- Blips de zones sur la carte + notification d'entrée de zone
-- + commande de déclaration de guerre.
-- ============================================================

local QBCore = exports['qb-core']:GetCoreObject()

local zoneBlips = {}      -- zoneBlips[zoneId] = { blip = handle, radius = handle }
local zoneState = {}      -- zoneState[zoneId] = { owner, war }
local currentZone = nil

-- ------------------------------------------------------------
-- Blips
-- ------------------------------------------------------------

local function blipColorFor(zoneId)
    local state = zoneState[zoneId]
    if not state then return Config.BlipColors.neutral end
    if state.war then return Config.BlipColors.war end
    if not state.owner then return Config.BlipColors.neutral end

    local playerData = QBCore.Functions.GetPlayerData()
    local myGang = playerData.gang and playerData.gang.name
    if myGang == state.owner then return Config.BlipColors.yours end
    return Config.BlipColors.owned
end

local function refreshBlips()
    for _, zone in ipairs(Config.Zones) do
        local existing = zoneBlips[zone.id]
        if existing then
            RemoveBlip(existing.blip)
            RemoveBlip(existing.radius)
        end

        local color = blipColorFor(zone.id)

        local radius = AddBlipForRadius(zone.center.x, zone.center.y, zone.center.z, zone.radius)
        SetBlipColour(radius, color)
        SetBlipAlpha(radius, 80)

        local blip = AddBlipForCoord(zone.center.x, zone.center.y, zone.center.z)
        SetBlipSprite(blip, zone.blipSprite)
        SetBlipColour(blip, color)
        SetBlipScale(blip, 0.9)
        SetBlipAsShortRange(blip, true)
        BeginTextCommandSetBlipName('STRING')
        local state = zoneState[zone.id]
        local suffix = ''
        if state and state.war then
            suffix = ' ⚔️'
        elseif state and state.owner then
            suffix = (' [%s]'):format(state.owner)
        end
        AddTextComponentString(zone.label .. suffix)
        EndTextCommandSetBlipName(blip)

        zoneBlips[zone.id] = { blip = blip, radius = radius }
    end
end

-- ------------------------------------------------------------
-- Sync de l'état depuis le serveur
-- ------------------------------------------------------------

RegisterNetEvent('av-territories:client:syncState', function(state)
    zoneState = state
    refreshBlips()
end)

AddEventHandler('QBCore:Client:OnPlayerLoaded', function()
    TriggerServerEvent('av-territories:server:requestState')
end)

-- Au restart de la ressource en cours de session
CreateThread(function()
    Wait(2000)
    TriggerServerEvent('av-territories:server:requestState')
end)

-- ------------------------------------------------------------
-- Détection d'entrée/sortie de zone (notification immersive)
-- ------------------------------------------------------------

CreateThread(function()
    while true do
        Wait(3000)
        local coords = GetEntityCoords(PlayerPedId())
        local found = nil
        for _, zone in ipairs(Config.Zones) do
            if #(coords - zone.center) <= zone.radius then
                found = zone
                break
            end
        end

        if found and currentZone ~= found.id then
            currentZone = found.id
            local state = zoneState[found.id]
            local owner = (state and state.owner) and ('Territoire : %s'):format(state.owner) or 'Territoire neutre'
            QBCore.Functions.Notify(('%s — %s'):format(found.label, owner), 'primary', 5000)
        elseif not found and currentZone then
            currentZone = nil
        end
    end
end)

-- ------------------------------------------------------------
-- Déclaration de guerre (depuis la zone visée)
-- ------------------------------------------------------------

RegisterCommand('guerre', function()
    if not currentZone then
        QBCore.Functions.Notify('Vous devez être dans le territoire visé pour déclarer la guerre.', 'error')
        return
    end
    TriggerServerEvent('av-territories:server:declareWar', currentZone)
end, false)
