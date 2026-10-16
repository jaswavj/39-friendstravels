-- Actual date/time for Ticket Entry and Other Income.
-- entry_date_time stays as the saved-at time. actual_date_time is the real ticket/income time.

ALTER TABLE `ticket_entry`
  ADD COLUMN `actual_date_time` datetime NULL;

UPDATE `ticket_entry`
  SET `actual_date_time` = `entry_date_time`
  WHERE `actual_date_time` IS NULL;
