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
                "CREATE TABLE IF NOT EXISTS ticket_entry ("
                        + "id int unsigned NOT NULL AUTO_INCREMENT,"
                        + "customer_id int unsigned NOT NULL,"
                        + "from_place_id int unsigned NOT NULL,"
                        + "to_place_id int unsigned NOT NULL,"
                        + "transport varchar(255) DEFAULT NULL,"
                        + "notes text,"
                        + "amount decimal(12,2) NOT NULL,"
                        + "cash_paid decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "gpay_paid decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "card_paid decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "credit_amount decimal(12,2) NOT NULL DEFAULT 0.00,"
                        + "entry_date_time datetime NOT NULL,"
                        + "uid int NOT NULL,"
                        + "is_active int DEFAULT 1,"
                        + "PRIMARY KEY (id),"
                        + "KEY idx_ticket_customer (customer_id),"
                        + "KEY idx_ticket_date (entry_date_time)"
                        + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
        );
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
        upsertModule(4, "Ticket Report");
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
