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
        jdbcTemplate.update(
                "INSERT INTO bill_type (id, type, `table`) "
                        + "SELECT 13, 'Ticket Entry', 'ticket_entry' FROM DUAL "
                        + "WHERE NOT EXISTS (SELECT 1 FROM bill_type WHERE id = 13)"
        );
        jdbcTemplate.update(
                "INSERT INTO user_modules (id, module_name) "
                        + "SELECT 13, 'Book Ticket' FROM DUAL "
                        + "WHERE NOT EXISTS (SELECT 1 FROM user_modules WHERE id = 13)"
        );
    }
}
