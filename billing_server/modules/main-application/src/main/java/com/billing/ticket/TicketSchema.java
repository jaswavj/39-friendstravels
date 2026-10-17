package com.billing.ticket;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TicketSchema {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensure() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS ticket_place ("
                        + "id int unsigned NOT NULL AUTO_INCREMENT,"
                        + "name varchar(255) NOT NULL,"
                        + "is_active int DEFAULT 1,"
                        + "PRIMARY KEY (id),"
                        + "UNIQUE KEY uq_ticket_place_name (name)"
                        + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
        );
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS income_type ("
                        + "id int unsigned NOT NULL AUTO_INCREMENT,"
                        + "name varchar(255) NOT NULL,"
                        + "is_active int DEFAULT 1,"
                        + "PRIMARY KEY (id),"
                        + "UNIQUE KEY uq_income_type_name (name)"
                        + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
        );
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS ticket_entry ("
                        + "id int unsigned NOT NULL AUTO_INCREMENT,"
                        + "customer_id int unsigned NOT NULL,"
                        + "from_place_id int unsigned NULL,"
                        + "to_place_id int unsigned NULL,"
                        + "transport varchar(255) DEFAULT NULL,"
                        + "notes text,"
                        + "amount decimal(12,2) NOT NULL,"
                        + "cash_paid decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "gpay_paid decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "card_paid decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "credit_amount decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "due_balance decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "entry_date_time datetime NOT NULL,"
                        + "actual_date_time datetime NULL,"
                        + "uid int NOT NULL,"
                        + "is_active int DEFAULT 1,"
                        + "entry_kind varchar(16) NOT NULL DEFAULT 'TICKET',"
                        + "income_type_id int unsigned NULL,"
                        + "qty decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "bus_name varchar(255) DEFAULT NULL,"
                        + "area varchar(255) DEFAULT NULL,"
                        + "seat_no varchar(64) DEFAULT NULL,"
                        + "PRIMARY KEY (id),"
                        + "KEY idx_ticket_customer (customer_id),"
                        + "KEY idx_ticket_date (entry_date_time),"
                        + "KEY idx_ticket_kind (entry_kind),"
                        + "KEY idx_ticket_income_type (income_type_id)"
                        + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
        );
        try {
            jdbcTemplate.execute("ALTER TABLE ticket_entry MODIFY from_place_id int unsigned NULL");
            jdbcTemplate.execute("ALTER TABLE ticket_entry MODIFY to_place_id int unsigned NULL");
        } catch (Exception ignored) {
        }
        addColumn("ticket_entry", "entry_kind", "varchar(16) NOT NULL DEFAULT 'TICKET'");
        addColumn("ticket_entry", "income_type_id", "int unsigned NULL");
        addColumn("ticket_entry", "qty", "decimal(12,2) NOT NULL DEFAULT 0.00");
        addColumn("ticket_entry", "bus_name", "varchar(255) DEFAULT NULL");
        addColumn("ticket_entry", "area", "varchar(255) DEFAULT NULL");
        addColumn("ticket_entry", "seat_no", "varchar(64) DEFAULT NULL");
        addColumn("ticket_entry", "party_paid", "decimal(12,2) NOT NULL DEFAULT 0.00");
        addColumn("expense_entry", "party_paid", "decimal(12,2) NOT NULL DEFAULT 0.00");
        addColumn("expense_entry", "qty", "decimal(12,2) NOT NULL DEFAULT 0.00");
        addColumn("expense_entry", "bus_name", "varchar(255) DEFAULT NULL");
        addColumn("expense_entry", "area", "varchar(255) DEFAULT NULL");
        addColumn("expense_entry", "customer_name", "varchar(255) DEFAULT NULL");
        addColumn("expense_entry", "customer_phone", "varchar(64) DEFAULT NULL");
        addColumn("ticket_entry", "actual_date_time", "datetime NULL");
        try {
            jdbcTemplate.update("UPDATE ticket_entry SET actual_date_time = entry_date_time WHERE actual_date_time IS NULL");
        } catch (Exception ignored) {
        }
        addColumn("ticket_entry", "due_balance", "decimal(12,2) NOT NULL DEFAULT 0.00");
        addColumn("prod_bill_due", "ticket_id", "int unsigned NULL");
        try {
            jdbcTemplate.execute("ALTER TABLE prod_bill_due ADD KEY idx_bill_due_ticket (ticket_id)");
        } catch (Exception ignored) {
        }
        try {
            jdbcTemplate.update(
                    "UPDATE ticket_entry t SET t.due_balance = t.credit_amount "
                            + "WHERE t.due_balance = 0 AND t.credit_amount > 0 "
                            + "AND NOT EXISTS (SELECT 1 FROM prod_bill_due d WHERE d.ticket_id = t.id)"
            );
        } catch (Exception ignored) {
        }
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS ticket_edit_log ("
                        + "id bigint NOT NULL AUTO_INCREMENT,"
                        + "ticket_id bigint NULL,"
                        + "doc_no varchar(255) NULL,"
                        + "action varchar(32) NOT NULL,"
                        + "details text,"
                        + "uid bigint NULL,"
                        + "date date NULL,"
                        + "time time NULL,"
                        + "PRIMARY KEY (id),"
                        + "KEY idx_ticket_edit_date (date)"
                        + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
        );
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS expense_edit_log ("
                        + "id bigint NOT NULL AUTO_INCREMENT,"
                        + "expense_id bigint NULL,"
                        + "doc_no varchar(255) NULL,"
                        + "action varchar(32) NOT NULL,"
                        + "details text,"
                        + "uid bigint NULL,"
                        + "date date NULL,"
                        + "time time NULL,"
                        + "PRIMARY KEY (id),"
                        + "KEY idx_expense_edit_date (date),"
                        + "KEY idx_expense_edit_expense (expense_id)"
                        + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
        );
        jdbcTemplate.update(
                "INSERT INTO bill_type (id, type, `table`) "
                        + "SELECT 13, 'Ticket Entry', 'ticket_entry' FROM DUAL "
                        + "WHERE NOT EXISTS (SELECT 1 FROM bill_type WHERE id = 13)"
        );
        ensureModules();
    }

    private void ensureModules() {
        String current = jdbcTemplate.query(
                "SELECT module_name FROM user_modules WHERE id = 1",
                rs -> rs.next() ? rs.getString(1) : ""
        );
        boolean already = current != null && current.equalsIgnoreCase("Dashboard");
        if (!already) {
            remapPermissions();
        }
        upsertModule(1, "Dashboard");
        upsertModule(2, "Book Ticket Entry");
        upsertModule(3, "Customers Balance");
        upsertModule(4, "Income Report");
        upsertModule(5, "Expense");
        jdbcTemplate.update(
                "INSERT INTO user_permission (module_id, uid, date, time) "
                        + "SELECT 6, src.uid, CURDATE(), CURTIME() FROM user_permission src "
                        + "WHERE src.module_id = 7 AND NOT EXISTS ("
                        + "SELECT 1 FROM user_permission x WHERE x.uid = src.uid AND x.module_id = 6)"
        );
        upsertModule(6, "Admin");
        jdbcTemplate.update("DELETE FROM user_permission WHERE module_id = 7");
        jdbcTemplate.update("DELETE FROM user_modules WHERE id = 7 OR id > 6");
        jdbcTemplate.update("DELETE FROM user_permission WHERE module_id < 1 OR module_id > 6");
        grantUid(1);
    }

    private void remapPermissions() {
        jdbcTemplate.update("UPDATE user_permission SET module_id = module_id + 1000");
        copyPerm(1008, 1);
        copyPerm(1001, 1);
        copyPerm(1013, 2);
        copyPerm(1010, 3);
        copyPerm(1013, 4);
        copyPerm(1006, 4);
        copyPerm(1008, 4);
        copyPerm(1012, 5);
        copyPerm(1004, 6);
        copyPerm(1007, 6);
        jdbcTemplate.update("DELETE FROM user_permission WHERE module_id >= 1000");
    }

    private void copyPerm(int fromId, int toId) {
        jdbcTemplate.update(
                "INSERT INTO user_permission (module_id, uid, date, time) "
                        + "SELECT ?, src.uid, CURDATE(), CURTIME() FROM user_permission src "
                        + "WHERE src.module_id = ? AND NOT EXISTS ("
                        + "SELECT 1 FROM user_permission x WHERE x.uid = src.uid AND x.module_id = ?)",
                toId, fromId, toId
        );
    }

    private void upsertModule(int id, String name) {
        int updated = jdbcTemplate.update("UPDATE user_modules SET module_name = ? WHERE id = ?", name, id);
        if (updated == 0) {
            jdbcTemplate.update("INSERT INTO user_modules (id, module_name) VALUES (?, ?)", id, name);
        }
    }

    private boolean addColumn(String table, String name, String definition) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                    Integer.class,
                    table, name
            );
            if (count == null || count == 0) {
                jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + name + " " + definition);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private void grantUid(int uid) {
        for (int id = 1; id <= 6; id++) {
            jdbcTemplate.update(
                    "INSERT INTO user_permission (module_id, uid, date, time) "
                            + "SELECT ?, ?, CURDATE(), CURTIME() FROM DUAL "
                            + "WHERE NOT EXISTS (SELECT 1 FROM user_permission WHERE uid = ? AND module_id = ?)",
                    id, uid, uid, id
            );
        }
    }
}
