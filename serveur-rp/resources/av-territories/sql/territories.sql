-- av-territories — schéma de base de données
-- À importer dans la base QBCore (voir README de la ressource).

CREATE TABLE IF NOT EXISTS `av_territories` (
    `zone_id`    VARCHAR(50)  NOT NULL,
    `owner_gang` VARCHAR(50)  DEFAULT NULL,
    `influence`  LONGTEXT     DEFAULT NULL,  -- JSON { "gang": score, ... }
    `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`zone_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historique des versements (audit + stats pour le site web / dashboard)
CREATE TABLE IF NOT EXISTS `av_territory_payouts` (
    `id`        INT          NOT NULL AUTO_INCREMENT,
    `zone_id`   VARCHAR(50)  NOT NULL,
    `gang`      VARCHAR(50)  NOT NULL,
    `amount`    INT          NOT NULL,
    `paid_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_gang` (`gang`),
    KEY `idx_zone` (`zone_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
