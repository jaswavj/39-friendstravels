-- Expense edit log (Admin → Expense Edit Log).
-- Skip if table already exists.

CREATE TABLE IF NOT EXISTS `expense_edit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `expense_id` bigint NULL,
  `doc_no` varchar(255) NULL,
  `action` varchar(32) NOT NULL,
  `details` text,
  `uid` bigint NULL,
  `date` date NULL,
  `time` time NULL,
  PRIMARY KEY (`id`),
  KEY `idx_expense_edit_date` (`date`),
  KEY `idx_expense_edit_expense` (`expense_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
