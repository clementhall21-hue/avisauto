fx_version 'cerulean'
game 'gta5'

name 'av-territories'
description 'Système de territoires de gangs — influence, contrôle, revenus, guerres'
author 'Serveur RP Crime Organisé'
version '0.1.0'

shared_scripts {
    'config.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua',
}

lua54 'yes'
