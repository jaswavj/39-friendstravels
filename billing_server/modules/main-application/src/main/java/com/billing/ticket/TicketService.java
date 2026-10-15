package com.billing.ticket;

import com.billing.ticket.dto.TicketCustomerData;
import com.billing.ticket.dto.TicketPlaceData;
import com.billing.ticket.dto.TicketSaveRequest;
import com.billing.ticket.dto.TicketSaveResult;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final JdbcTemplate jdbcTemplate;

    public List<TicketCustomerData> searchCustomers(String query, String phone) {
        String term = phone != null && !phone.isBlank() ? phone.trim() : (query == null ? "" : query.trim());
        if (term.isEmpty()) {
            return List.of();
        }
        boolean byPhone = phone != null && !phone.isBlank() || term.chars().allMatch(Character::isDigit);
        String where = byPhone ? "phone_number LIKE ?" : "name LIKE ?";
        return jdbcTemplate.query(
                "SELECT id, name, CASE WHEN phone_number = '' OR phone_number IS NULL THEN '' ELSE phone_number END AS phone_number "
                        + "FROM customers WHERE is_active = 1 AND " + where + " ORDER BY name LIMIT 10",
                (rs, i) -> {
                    TicketCustomerData row = new TicketCustomerData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setPhone(rs.getString("phone_number"));
                    return row;
                },
                "%" + term + "%"
        );
    }

    public List<TicketPlaceData> searchPlaces(String query) {
        String term = query == null ? "" : query.trim();
        if (term.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.query(
                "SELECT id, name FROM ticket_place WHERE is_active = 1 AND name LIKE ? ORDER BY name LIMIT 10",
                (rs, i) -> {
                    TicketPlaceData row = new TicketPlaceData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    return row;
                },
                "%" + term + "%"
        );
    }

    @Transactional
    public TicketSaveResult save(TicketSaveRequest request, Long uid) {
        if (request == null) {
            throw new RuntimeException("Ticket details are required");
        }
        String transport = required(request.getTransport(), "Transport is required");
        String notes = request.getNotes() == null ? "" : request.getNotes().trim();
        double amount = money(request.getAmount());
        double cash = money(request.getCashPaid());
        double gpay = money(request.getGpayPaid());
        double card = money(request.getCardPaid());
        double credit = money(request.getCredit());
        if (amount <= 0) {
            throw new RuntimeException("Please enter a valid ticket amount");
        }
        if (cash < 0 || gpay < 0 || card < 0 || credit < 0) {
            throw new RuntimeException("Payment amounts cannot be negative");
        }
        if (Math.abs((cash + gpay + card + credit) - amount) > 0.01) {
            throw new RuntimeException("Cash + GPay + Card + Credit must equal the ticket amount");
        }
        String dateTime = entryDateTime(request.getEntryDate(), request.getEntryTime());

        long customerId = resolveCustomer(request.getCustomerId(), request.getCustomerName(), request.getPhone());
        long fromId = resolvePlace(request.getFromPlaceId(), request.getFromName(), "From");
        long toId = resolvePlace(request.getToPlaceId(), request.getToName(), "To");
        double balance = addCredit(customerId, credit);

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO ticket_entry (customer_id, from_place_id, to_place_id, transport, notes, amount, "
                            + "cash_paid, gpay_paid, card_paid, credit_amount, entry_date_time, uid, is_active) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, customerId);
            ps.setLong(2, fromId);
            ps.setLong(3, toId);
            ps.setString(4, transport);
            ps.setString(5, notes);
            ps.setDouble(6, amount);
            ps.setDouble(7, cash);
            ps.setDouble(8, gpay);
            ps.setDouble(9, card);
            ps.setDouble(10, credit);
            ps.setString(11, dateTime);
            ps.setLong(12, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to save ticket");
        }

        double bank = money(gpay + card);
        int payMode = cash > 0 && bank > 0 ? 3 : bank > 0 ? 2 : 1;
        int payType = gpay > 0 && card > 0 ? 3 : gpay > 0 ? 1 : card > 0 ? 2 : 0;
        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) "
                        + "VALUES (13, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)",
                key.longValue(), customerId, payMode, amount, cash, bank, payType, uid, dateTime
        );

        TicketSaveResult result = new TicketSaveResult();
        result.setId(key.longValue());
        result.setCustomerId(customerId);
        result.setCredit(credit);
        result.setBalance(balance);
        return result;
    }

    private long resolveCustomer(Long customerId, String rawName, String rawPhone) {
        String name = required(rawName, "Customer name is required");
        String phone = rawPhone == null ? "" : rawPhone.trim();
        if (customerId != null && customerId > 0) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT name, COALESCE(phone_number, '') AS phone_number FROM customers WHERE id = ? AND is_active = 1",
                    customerId
            );
            if (!rows.isEmpty() && name.equalsIgnoreCase(String.valueOf(rows.get(0).get("name")).trim())) {
                String storedPhone = String.valueOf(rows.get(0).get("phone_number")).trim();
                if (!phone.isEmpty() && storedPhone.isEmpty()) {
                    jdbcTemplate.update("UPDATE customers SET phone_number = ? WHERE id = ?", phone, customerId);
                }
                ensureAccount(customerId);
                return customerId;
            }
        }
        if (!phone.isEmpty()) {
            List<Long> byPhone = jdbcTemplate.query(
                    "SELECT id FROM customers WHERE is_active = 1 AND phone_number = ? ORDER BY id LIMIT 1",
                    (rs, i) -> rs.getLong(1),
                    phone
            );
            if (!byPhone.isEmpty()) {
                ensureAccount(byPhone.get(0));
                return byPhone.get(0);
            }
        }
        if (phone.isEmpty()) {
            List<Long> byName = jdbcTemplate.query(
                    "SELECT id FROM customers WHERE is_active = 1 AND name = ? ORDER BY id",
                    (rs, i) -> rs.getLong(1),
                    name
            );
            if (byName.size() > 1) {
                throw new RuntimeException("More than one customer is named " + name + ". Enter the phone number.");
            }
            if (byName.size() == 1) {
                ensureAccount(byName.get(0));
                return byName.get(0);
            }
        } else {
            List<Long> byName = jdbcTemplate.query(
                    "SELECT id FROM customers WHERE is_active = 1 AND name = ? AND phone_number = ? ORDER BY id LIMIT 1",
                    (rs, i) -> rs.getLong(1),
                    name, phone
            );
            if (!byName.isEmpty()) {
                ensureAccount(byName.get(0));
                return byName.get(0);
            }
        }
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO customers(name, date, time, address, phone_number, gstin, is_gst, is_eligible_for_commission) "
                            + "VALUES (?, NOW(), NOW(), '', ?, '', 0, 0)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, name);
            ps.setString(2, phone);
            return ps;
        }, keys);
        long newId = requireKey(keys, "Failed to add customer");
        jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", newId);
        return newId;
    }

    private long resolvePlace(Long placeId, String rawName, String label) {
        String name = required(rawName, label + " place is required");
        if (placeId != null && placeId > 0) {
            List<String> names = jdbcTemplate.query(
                    "SELECT name FROM ticket_place WHERE id = ? AND is_active = 1",
                    (rs, i) -> rs.getString(1),
                    placeId
            );
            if (!names.isEmpty() && name.equalsIgnoreCase(names.get(0).trim())) {
                return placeId;
            }
        }
        List<Long> found = jdbcTemplate.query(
                "SELECT id FROM ticket_place WHERE is_active = 1 AND name = ? ORDER BY id LIMIT 1",
                (rs, i) -> rs.getLong(1),
                name
        );
        if (!found.isEmpty()) {
            return found.get(0);
        }
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO ticket_place(name, is_active) VALUES (?, 1)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, name);
            return ps;
        }, keys);
        return requireKey(keys, "Failed to add " + label.toLowerCase() + " place");
    }

    private double addCredit(long customerId, double credit) {
        ensureAccount(customerId);
        if (credit > 0) {
            jdbcTemplate.update(
                    "UPDATE customer_account SET balance = balance + ? WHERE customer_id = ?",
                    credit, customerId
            );
        }
        Double balance = jdbcTemplate.query(
                "SELECT balance FROM customer_account WHERE customer_id = ?",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                customerId
        );
        return balance == null ? 0d : balance;
    }

    private void ensureAccount(long customerId) {
        Integer count = jdbcTemplate.query(
                "SELECT COUNT(*) FROM customer_account WHERE customer_id = ?",
                rs -> rs.next() ? rs.getInt(1) : 0,
                customerId
        );
        if (count == null || count == 0) {
            jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", customerId);
        }
    }

    private String entryDateTime(String date, String time) {
        String day = required(date, "Please select a date");
        String clock = required(time, "Please select a time");
        if (clock.length() == 5) {
            clock = clock + ":00";
        }
        return day + " " + clock;
    }

    private long requireKey(KeyHolder keys, String message) {
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException(message);
        }
        return key.longValue();
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    private double money(Double value) {
        if (value == null) {
            return 0;
        }
        return Math.round(value * 100.0) / 100.0;
    }
}
