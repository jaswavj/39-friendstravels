-- Other Income on Ticket Entry.
-- Safe to run more than once if a statement errors on "Duplicate column".

USE `friendstransport`;

CREATE TABLE IF NOT EXISTS `income_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` int DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_income_type_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `ticket_entry`
  MODIFY `from_place_id` int unsigned NULL,
  MODIFY `to_place_id` int unsigned NULL;

ALTER TABLE `ticket_entry`
  ADD COLUMN `entry_kind` varchar(16) NOT NULL DEFAULT 'TICKET';

ALTER TABLE `ticket_entry`
  ADD COLUMN `income_type_id` int unsigned NULL;

ALTER TABLE `ticket_entry`
  ADD KEY `idx_ticket_kind` (`entry_kind`);

ALTER TABLE `ticket_entry`
  ADD KEY `idx_ticket_income_type` (`income_type_id`);
