-- Qty, Bus name, Area on Other Income (ticket_entry) and Expense Entry.
-- Safe to skip a statement if it errors with Duplicate column name.

ALTER TABLE `ticket_entry`
  ADD COLUMN `qty` decimal(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `bus_name` varchar(255) DEFAULT NULL,
  ADD COLUMN `area` varchar(255) DEFAULT NULL;

ALTER TABLE `expense_entry`
  ADD COLUMN `qty` decimal(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `bus_name` varchar(255) DEFAULT NULL,
  ADD COLUMN `area` varchar(255) DEFAULT NULL;
