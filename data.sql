/*
SQLyog Community v13.3.1 (64 bit)
MySQL - 8.4.7 : Database - friendstravels
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`friendstravels` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `friendstravels`;

/*Table structure for table `bill_type` */

DROP TABLE IF EXISTS `bill_type`;

CREATE TABLE `bill_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) DEFAULT NULL,
  `table` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `bill_type` */

insert  into `bill_type`(`id`,`type`,`table`) values 
(1,'customer bill','prod_bill'),
(2,'customer balance collection','prod_bill_due'),
(3,'customer add advance','prod_bill_due'),
(4,'Customer old Balance add','prod_bill_due'),
(5,'purchase entry','prod_purchase'),
(6,'supplier balance collection','prod_supplier_due'),
(7,'supplier add advance','prod_supplier_due'),
(8,'Purchase Return','prod_purchase_return'),
(9,'Expense Entry','expense_entry'),
(11,'opening balance',NULL),
(12,'supplier old balance add','prod_supplier_due'),
(13,'Ticket Entry','ticket_entry');

/*Table structure for table `company_details` */

DROP TABLE IF EXISTS `company_details`;

CREATE TABLE `company_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `shop_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `address` text,
  `gstin` varchar(255) DEFAULT NULL,
  `print_type` int NOT NULL DEFAULT '0',
  `bank_details` varchar(255) DEFAULT NULL,
  `barcode_printer` varchar(255) DEFAULT NULL,
  `billing_type` int NOT NULL DEFAULT '1',
  `barcode_per_row` int NOT NULL DEFAULT '1',
  `barcode_width_mm` int NOT NULL DEFAULT '50',
  `barcode_height_mm` int NOT NULL DEFAULT '30',
  `printer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `thermal_print_type` int DEFAULT '1' COMMENT '1=local,2=cloud',
  `thermal_txt_file` int DEFAULT '1' COMMENT '1=txt file in bill folder',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `company_details` */

insert  into `company_details`(`id`,`shop_name`,`address`,`gstin`,`print_type`,`bank_details`,`barcode_printer`,`billing_type`,`barcode_per_row`,`barcode_width_mm`,`barcode_height_mm`,`printer_name`,`thermal_print_type`,`thermal_txt_file`) values 
(2,'FRIENDS TRAVELS','SATHANKULAM\nCELL - 7200607200 , 9788788222','',1,'','AP4909',1,3,50,30,'TVSE RP3200 Lite',1,0);

/*Table structure for table `configure_bank_details` */

DROP TABLE IF EXISTS `configure_bank_details`;

CREATE TABLE `configure_bank_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_blocked` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

/*Data for the table `configure_bank_details` */

insert  into `configure_bank_details`(`id`,`name`,`is_blocked`) values 
(1,'SBI BANK',0),
(2,'CANARA BANK',0),
(3,'AXIS BANK',0),
(4,'IOB BANK',0);

/*Table structure for table `configure_payment_type` */

DROP TABLE IF EXISTS `configure_payment_type`;

CREATE TABLE `configure_payment_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_blocked` int unsigned NOT NULL DEFAULT '0',
  `type_id` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

/*Data for the table `configure_payment_type` */

insert  into `configure_payment_type`(`id`,`name`,`is_blocked`,`type_id`) values 
(1,'Cash',0,1),
(2,'BANK',0,2);

/*Table structure for table `credit_days` */

DROP TABLE IF EXISTS `credit_days`;

CREATE TABLE `credit_days` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `credit_days` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `credit_days` */

insert  into `credit_days`(`id`,`credit_days`) values 
(1,10);

/*Table structure for table `customer_account` */

DROP TABLE IF EXISTS `customer_account`;

CREATE TABLE `customer_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `advance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `customer_account` */

/*Table structure for table `customers` */

DROP TABLE IF EXISTS `customers`;

CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  `is_eligible_for_commission` tinyint DEFAULT '1',
  `is_active` int DEFAULT '1',
  `gstin` varchar(255) DEFAULT NULL,
  `is_gst` int DEFAULT '0',
  `salesman` int DEFAULT NULL,
  `area` int DEFAULT NULL,
  `credit_limit` double(10,2) NOT NULL DEFAULT '0.00',
  `local` int DEFAULT '1',
  `exchange_point` double(10,3) DEFAULT '0.000',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `customers` */

/*Table structure for table `daybook_opening_balance` */

DROP TABLE IF EXISTS `daybook_opening_balance`;

CREATE TABLE `daybook_opening_balance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `balance_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  `uid` int DEFAULT NULL,
  `entry_date` date NOT NULL,
  `entry_time` time NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_balance_date` (`balance_date`),
  KEY `idx_active_date` (`is_active`,`balance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `daybook_opening_balance` */

/*Table structure for table `expense_entry` */

DROP TABLE IF EXISTS `expense_entry`;

CREATE TABLE `expense_entry` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `exp_type` int NOT NULL,
  `content` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `exc_date_time` datetime DEFAULT NULL,
  `entry_date_time` datetime DEFAULT NULL,
  `is_active` int DEFAULT '1',
  `uid` int NOT NULL,
  `qty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `bus_name` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `party_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `type` (`exp_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `expense_entry` */

/*Table structure for table `expense_type` */

DROP TABLE IF EXISTS `expense_type`;

CREATE TABLE `expense_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `expense_type` */

/*Table structure for table `gstin` */

DROP TABLE IF EXISTS `gstin`;

CREATE TABLE `gstin` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `gstin` varchar(255) NOT NULL,
  `shop_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `gstin` */

/*Table structure for table `heading` */

DROP TABLE IF EXISTS `heading`;

CREATE TABLE `heading` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `head1` varchar(255) DEFAULT NULL,
  `head2` varchar(255) DEFAULT NULL,
  `head3` varchar(255) DEFAULT NULL,
  `active` int DEFAULT '0',
  `starting_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Data for the table `heading` */

insert  into `heading`(`id`,`head1`,`head2`,`head3`,`active`,`starting_date`) values 
(1,'Category','Brand','Product',10,'2026-10-11');

/*Table structure for table `income_type` */

DROP TABLE IF EXISTS `income_type`;

CREATE TABLE `income_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_income_type_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `income_type` */

/*Table structure for table `prod_bill_due` */

DROP TABLE IF EXISTS `prod_bill_due`;

CREATE TABLE `prod_bill_due` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `amount` double(10,3) NOT NULL DEFAULT '0.000',
  `cash_paid` double(10,3) NOT NULL DEFAULT '0.000',
  `bank_paid` double(10,3) NOT NULL DEFAULT '0.000',
  `balance` double(10,3) NOT NULL DEFAULT '0.000',
  `pay_mode` tinyint NOT NULL DEFAULT '1',
  `pay_type` tinyint NOT NULL DEFAULT '0',
  `txn_type` varchar(20) NOT NULL DEFAULT 'COLLECTION',
  `notes` varchar(255) DEFAULT NULL,
  `uid` int NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `ticket_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bill_due_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `prod_bill_due` */

/*Table structure for table `prod_bill_due_collection` */

DROP TABLE IF EXISTS `prod_bill_due_collection`;

CREATE TABLE `prod_bill_due_collection` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `balance` double(10,2) DEFAULT NULL,
  `paid` double(10,2) DEFAULT NULL,
  `finalBalance` double(10,2) DEFAULT NULL,
  `mode` int DEFAULT NULL,
  `bankOption` int DEFAULT NULL,
  `uid` int NOT NULL,
  `collectDate` varchar(255) DEFAULT NULL,
  `collectTime` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `billId` (`bill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `prod_bill_due_collection` */

/*Table structure for table `prod_bill_edit_log` */

DROP TABLE IF EXISTS `prod_bill_edit_log`;

CREATE TABLE `prod_bill_edit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bill_id` bigint DEFAULT NULL,
  `bill_display` varchar(64) DEFAULT NULL,
  `action` varchar(32) NOT NULL,
  `details` text,
  `uid` bigint DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_edit_log_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `prod_bill_edit_log` */

/*Table structure for table `prod_bill_payment_type` */

DROP TABLE IF EXISTS `prod_bill_payment_type`;

CREATE TABLE `prod_bill_payment_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

/*Data for the table `prod_bill_payment_type` */

insert  into `prod_bill_payment_type`(`id`,`type`,`is_active`) values 
(0,'CASH',1),
(1,'UPI',1),
(2,'DEBIT CARD',1),
(3,'CREDIT CARD',1),
(4,'NET BANKING',1),
(5,'WALLET',1),
(6,'CHEQUE',1);

/*Table structure for table `prod_ledger` */

DROP TABLE IF EXISTS `prod_ledger`;

CREATE TABLE `prod_ledger` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `bill_type` int NOT NULL COMMENT 'FK logical: bill_type.id',
  `bill_id` int NOT NULL DEFAULT '0' COMMENT 'Source row id e.g. prod_bill.id',
  `customer_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `payment_mode` tinyint NOT NULL DEFAULT '1' COMMENT '1=Cash 2=Bank 3=Mixed',
  `bill_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cash_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `bank_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_type` tinyint NOT NULL DEFAULT '0' COMMENT 'UPI, card, etc. from configure_payment_type',
  `uid` int NOT NULL,
  `date_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bill_type_id` (`bill_type`,`bill_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_date_time` (`date_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `prod_ledger` */

/*Table structure for table `special_permission` */

DROP TABLE IF EXISTS `special_permission`;

CREATE TABLE `special_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `content` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `special_permission` */

insert  into `special_permission`(`id`,`content`) values 
(1,'allow to Zero stock billing ');

/*Table structure for table `ticket_edit_log` */

DROP TABLE IF EXISTS `ticket_edit_log`;

CREATE TABLE `ticket_edit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_id` bigint DEFAULT NULL,
  `doc_no` varchar(255) DEFAULT NULL,
  `action` varchar(32) NOT NULL,
  `details` text,
  `uid` bigint DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_edit_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `ticket_edit_log` */

/*Table structure for table `ticket_entry` */

DROP TABLE IF EXISTS `ticket_entry`;

CREATE TABLE `ticket_entry` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int unsigned NOT NULL,
  `from_place_id` int unsigned DEFAULT NULL,
  `to_place_id` int unsigned DEFAULT NULL,
  `transport` varchar(255) DEFAULT NULL,
  `notes` text,
  `amount` decimal(12,2) NOT NULL,
  `cash_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gpay_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `card_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `credit_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `entry_date_time` datetime NOT NULL,
  `uid` int NOT NULL,
  `is_active` int DEFAULT '1',
  `entry_kind` varchar(16) NOT NULL DEFAULT 'TICKET',
  `income_type_id` int unsigned DEFAULT NULL,
  `qty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `bus_name` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `actual_date_time` datetime DEFAULT NULL,
  `due_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `seat_no` varchar(64) DEFAULT NULL,
  `party_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_ticket_customer` (`customer_id`),
  KEY `idx_ticket_date` (`entry_date_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `ticket_entry` */

/*Table structure for table `ticket_place` */

DROP TABLE IF EXISTS `ticket_place`;

CREATE TABLE `ticket_place` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_place_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `ticket_place` */

/*Table structure for table `user_modules` */

DROP TABLE IF EXISTS `user_modules`;

CREATE TABLE `user_modules` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `module_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=latin1;

/*Data for the table `user_modules` */

insert  into `user_modules`(`id`,`module_name`) values 
(1,'Dashboard'),
(2,'Book Ticket Entry'),
(3,'Customers Balance'),
(4,'Income Report'),
(5,'Expense'),
(6,'Admin');

/*Table structure for table `user_permission` */

DROP TABLE IF EXISTS `user_permission`;

CREATE TABLE `user_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `uid` int NOT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mod` (`module_id`),
  KEY `uid` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=latin1;

/*Data for the table `user_permission` */

insert  into `user_permission`(`id`,`module_id`,`uid`,`date`,`time`) values 
(70,1,1,'2025-09-19','11:43:23'),
(71,2,1,'2025-09-19','11:43:23'),
(72,3,1,'2025-09-19','11:43:23'),
(73,4,1,'2025-09-19','11:43:23'),
(74,5,1,'2025-09-19','11:43:23'),
(122,6,1,'2026-10-15','17:22:10');

/*Table structure for table `user_special_permission` */

DROP TABLE IF EXISTS `user_special_permission`;

CREATE TABLE `user_special_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `content_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `user_special_permission` */

insert  into `user_special_permission`(`id`,`content_id`,`user_id`) values 
(3,1,1);

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  `fullName` varchar(255) DEFAULT NULL,
  `disc_per` int DEFAULT '100',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1;

/*Data for the table `users` */

insert  into `users`(`id`,`user_name`,`password`,`is_active`,`fullName`,`disc_per`) values 
(1,'admin','aecbf9a63cec1e93327dfc212f31acdb31c4f5d10bedccf8fbb8b042a6f0f39155797bdd04517905ae5d98b69fdc452cdb61b018e10939740ec96f36e133d639',1,'admin',50);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
