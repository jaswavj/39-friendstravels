package com.billing.ticket;

import com.billing.common.JdbcPageHelper;
import com.billing.core.pagination.PageResult;
import com.billing.ticket.dto.TicketCancelRequest;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
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

    public Map<String, Object> report(String from, String to, String customerName, String phone,
                                     int page, int size) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        String name = customerName == null ? "" : customerName.trim();
        String phoneTerm = phone == null ? "" : phone.trim();
        StringBuilder filter = new StringBuilder(
                " FROM ticket_entry t "
                        + "LEFT JOIN customers c ON c.id = t.customer_id "
                        + "WHERE t.is_active = 1 AND DATE(t.entry_date_time) BETWEEN ? AND ?"
        );
        List<Object> args = new ArrayList<>();
        args.add(fromDate);
        args.add(toDate);
        if (!name.isEmpty()) {
            filter.append(" AND c.name LIKE ?");
            args.add("%" + name + "%");
        }
        if (!phoneTerm.isEmpty()) {
            filter.append(" AND c.phone_number LIKE ?");
            args.add("%" + phoneTerm + "%");
        }
        String sql = "SELECT t.id, DATE_FORMAT(t.entry_date_time, '%Y-%m-%d %H:%i') AS dateTime, "
                + "COALESCE(c.name, '') AS customerName, COALESCE(c.phone_number, '') AS phone, "
                + "fp.name AS fromName, tp.name AS toName, COALESCE(t.transport, '') AS transport, "
                + "COALESCE(t.notes, '') AS notes, t.amount, t.cash_paid, t.gpay_paid, t.card_paid, "
                + "t.credit_amount, COALESCE(u.user_name, '') AS userName "
                + "FROM ticket_entry t "
                + "JOIN ticket_place fp ON fp.id = t.from_place_id "
                + "JOIN ticket_place tp ON tp.id = t.to_place_id "
                + "LEFT JOIN customers c ON c.id = t.customer_id "
                + "LEFT JOIN users u ON u.id = t.uid "
                + "WHERE t.is_active = 1 AND DATE(t.entry_date_time) BETWEEN ? AND ?"
                + (name.isEmpty() ? "" : " AND c.name LIKE ?")
                + (phoneTerm.isEmpty() ? "" : " AND c.phone_number LIKE ?")
                + " ORDER BY t.entry_date_time DESC, t.id DESC";
        PageResult<Map<String, Object>> pg = JdbcPageHelper.query(
                jdbcTemplate,
                sql,
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("dateTime", rs.getString("dateTime"));
                    row.put("customerName", rs.getString("customerName"));
                    row.put("phone", rs.getString("phone"));
                    row.put("fromName", rs.getString("fromName"));
                    row.put("toName", rs.getString("toName"));
                    row.put("route", rs.getString("fromName") + " → " + rs.getString("toName"));
                    row.put("transport", rs.getString("transport"));
                    row.put("notes", rs.getString("notes"));
                    row.put("amount", rs.getDouble("amount"));
                    row.put("cashPaid", rs.getDouble("cash_paid"));
                    row.put("gpayPaid", rs.getDouble("gpay_paid"));
                    row.put("cardPaid", rs.getDouble("card_paid"));
                    row.put("credit", rs.getDouble("credit_amount"));
                    row.put("userName", rs.getString("userName"));
                    return row;
                },
                page,
                size,
                args.toArray()
        );
        Map<String, Object> sums = jdbcTemplate.queryForMap(
                "SELECT COALESCE(SUM(t.amount), 0) AS amount, COALESCE(SUM(t.credit_amount), 0) AS credit" + filter,
                args.toArray()
        );
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", pg.getItems());
        data.put("total", pg.getTotal());
        data.put("page", pg.getPage());
        data.put("size", pg.getSize());
        data.put("amount", num(sums.get("amount")));
        data.put("credit", num(sums.get("credit")));
        return data;
    }

    public Map<String, Object> get(long id) {
        return load(id);
    }

    public void logView(long id, Long uid) {
        Map<String, Object> ticket = load(id);
        logTicket(id, str(ticket.get("route")), "VIEW",
                "Viewed ticket · Amount " + rupee(num(ticket.get("amount"))), uid);
    }

    @Transactional
    public void cancel(long id, TicketCancelRequest request, Long uid) {
        String reason = required(request == null ? null : request.getReason(), "Reason for cancellation is required");
        Map<String, Object> ticket = load(id);
        long customerId = ((Number) ticket.get("customerId")).longValue();
        double credit = num(ticket.get("credit"));
        double amount = num(ticket.get("amount"));
        String route = str(ticket.get("route"));
        adjustCredit(customerId, -credit);
        int updated = jdbcTemplate.update(
                "UPDATE ticket_entry SET is_active = 0 WHERE id = ? AND is_active = 1",
                id
        );
        if (updated == 0) {
            throw new RuntimeException("Ticket not found or already cancelled");
        }
        jdbcTemplate.update("DELETE FROM prod_ledger WHERE bill_type = 13 AND bill_id = ?", id);
        logTicket(id, route, "CANCEL",
                "Cancelled · Amount " + rupee(amount)
                        + (credit > 0 ? " · Credit reversed " + rupee(credit) : "")
                        + " · Reason: " + reason,
                uid);
    }

    @Transactional
    public TicketSaveResult update(long id, TicketSaveRequest request, Long uid) {
        Map<String, Object> old = load(id);
        ParsedTicket next = parse(request);
        long oldCustomerId = ((Number) old.get("customerId")).longValue();
        double oldCredit = num(old.get("credit"));
        double oldAmount = num(old.get("amount"));
        double oldCash = num(old.get("cashPaid"));
        double oldGpay = num(old.get("gpayPaid"));
        double oldCard = num(old.get("cardPaid"));
        String oldRoute = str(old.get("route"));
        String oldCustomer = str(old.get("customerName"));
        String oldTransport = str(old.get("transport"));
        String oldNotes = str(old.get("notes"));
        String oldDateTime = str(old.get("dateTime"));

        long customerId = resolveCustomer(request.getCustomerId(), request.getCustomerName(), request.getPhone());
        long fromId = resolvePlace(request.getFromPlaceId(), request.getFromName(), "From");
        long toId = resolvePlace(request.getToPlaceId(), request.getToName(), "To");

        double balance;
        if (oldCustomerId != customerId) {
            adjustCredit(oldCustomerId, -oldCredit);
            balance = adjustCredit(customerId, next.credit);
        } else {
            balance = adjustCredit(customerId, next.credit - oldCredit);
        }

        int updated = jdbcTemplate.update(
                "UPDATE ticket_entry SET customer_id = ?, from_place_id = ?, to_place_id = ?, transport = ?, notes = ?, "
                        + "amount = ?, cash_paid = ?, gpay_paid = ?, card_paid = ?, credit_amount = ?, entry_date_time = ?, uid = ? "
                        + "WHERE id = ? AND is_active = 1",
                customerId, fromId, toId, next.transport, next.notes, next.amount, next.cash, next.gpay, next.card,
                next.credit, next.dateTime, uid, id
        );
        if (updated == 0) {
            throw new RuntimeException("Ticket not found");
        }
        writeLedger(id, customerId, next.amount, next.cash, next.gpay, next.card, uid, next.dateTime);

        String route = next.fromName + " → " + next.toName;
        List<String> changes = new ArrayList<>();
        if (!oldCustomer.equalsIgnoreCase(str(request.getCustomerName()))) {
            changes.add("Customer " + oldCustomer + " → " + str(request.getCustomerName()));
        }
        if (!oldRoute.equals(route)) {
            changes.add(oldRoute + " → " + route);
        }
        if (!oldTransport.equalsIgnoreCase(next.transport)) {
            changes.add("Transport " + oldTransport + " → " + next.transport);
        }
        if (Math.abs(oldAmount - next.amount) > 0.01) {
            changes.add("Amount " + rupee(oldAmount) + " → " + rupee(next.amount));
        }
        if (Math.abs(oldCash - next.cash) > 0.01) {
            changes.add("Cash " + rupee(oldCash) + " → " + rupee(next.cash));
        }
        if (Math.abs(oldGpay - next.gpay) > 0.01) {
            changes.add("GPay " + rupee(oldGpay) + " → " + rupee(next.gpay));
        }
        if (Math.abs(oldCard - next.card) > 0.01) {
            changes.add("Card " + rupee(oldCard) + " → " + rupee(next.card));
        }
        if (Math.abs(oldCredit - next.credit) > 0.01) {
            changes.add("Credit " + rupee(oldCredit) + " → " + rupee(next.credit));
        }
        if (!oldNotes.equals(next.notes)) {
            changes.add("Notes updated");
        }
        String newStamp = next.dateTime.length() >= 16 ? next.dateTime.substring(0, 16) : next.dateTime;
        if (!oldDateTime.equals(newStamp)) {
            changes.add("Date " + oldDateTime + " → " + newStamp);
        }
        if (changes.isEmpty()) {
            changes.add("Details saved");
        }
        logTicket(id, route, "EDIT", String.join(" · ", changes), uid);

        TicketSaveResult result = new TicketSaveResult();
        result.setId(id);
        result.setCustomerId(customerId);
        result.setCredit(next.credit);
        result.setBalance(balance);
        return result;
    }

    @Transactional
    public TicketSaveResult save(TicketSaveRequest request, Long uid) {
        ParsedTicket next = parse(request);

        long customerId = resolveCustomer(request.getCustomerId(), request.getCustomerName(), request.getPhone());
        long fromId = resolvePlace(request.getFromPlaceId(), request.getFromName(), "From");
        long toId = resolvePlace(request.getToPlaceId(), request.getToName(), "To");
        double balance = adjustCredit(customerId, next.credit);

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
            ps.setString(4, next.transport);
            ps.setString(5, next.notes);
            ps.setDouble(6, next.amount);
            ps.setDouble(7, next.cash);
            ps.setDouble(8, next.gpay);
            ps.setDouble(9, next.card);
            ps.setDouble(10, next.credit);
            ps.setString(11, next.dateTime);
            ps.setLong(12, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to save ticket");
        }

        writeLedger(key.longValue(), customerId, next.amount, next.cash, next.gpay, next.card, uid, next.dateTime);
        String route = next.fromName + " → " + next.toName;
        logTicket(key.longValue(), route, "CREATE",
                "Amount " + rupee(next.amount) + (next.credit > 0 ? " · Credit " + rupee(next.credit) : ""),
                uid);

        TicketSaveResult result = new TicketSaveResult();
        result.setId(key.longValue());
        result.setCustomerId(customerId);
        result.setCredit(next.credit);
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

    private Map<String, Object> load(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT t.id, t.customer_id, COALESCE(c.name, '') AS customerName, COALESCE(c.phone_number, '') AS phone, "
                        + "t.from_place_id, fp.name AS fromName, t.to_place_id, tp.name AS toName, "
                        + "COALESCE(t.transport, '') AS transport, COALESCE(t.notes, '') AS notes, "
                        + "t.amount, t.cash_paid, t.gpay_paid, t.card_paid, t.credit_amount, "
                        + "DATE_FORMAT(t.entry_date_time, '%Y-%m-%d') AS entryDate, "
                        + "DATE_FORMAT(t.entry_date_time, '%H:%i') AS entryTime, "
                        + "DATE_FORMAT(t.entry_date_time, '%Y-%m-%d %H:%i') AS dateTime "
                        + "FROM ticket_entry t "
                        + "JOIN ticket_place fp ON fp.id = t.from_place_id "
                        + "JOIN ticket_place tp ON tp.id = t.to_place_id "
                        + "LEFT JOIN customers c ON c.id = t.customer_id "
                        + "WHERE t.id = ? AND t.is_active = 1",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("customerId", rs.getLong("customer_id"));
                    row.put("customerName", rs.getString("customerName"));
                    row.put("phone", rs.getString("phone"));
                    row.put("fromPlaceId", rs.getLong("from_place_id"));
                    row.put("fromName", rs.getString("fromName"));
                    row.put("toPlaceId", rs.getLong("to_place_id"));
                    row.put("toName", rs.getString("toName"));
                    row.put("route", rs.getString("fromName") + " → " + rs.getString("toName"));
                    row.put("transport", rs.getString("transport"));
                    row.put("notes", rs.getString("notes"));
                    row.put("amount", rs.getDouble("amount"));
                    row.put("cashPaid", rs.getDouble("cash_paid"));
                    row.put("gpayPaid", rs.getDouble("gpay_paid"));
                    row.put("cardPaid", rs.getDouble("card_paid"));
                    row.put("credit", rs.getDouble("credit_amount"));
                    row.put("entryDate", rs.getString("entryDate"));
                    row.put("entryTime", rs.getString("entryTime"));
                    row.put("dateTime", rs.getString("dateTime"));
                    return row;
                },
                id
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Ticket not found");
        }
        return rows.get(0);
    }

    private ParsedTicket parse(TicketSaveRequest request) {
        if (request == null) {
            throw new RuntimeException("Ticket details are required");
        }
        ParsedTicket next = new ParsedTicket();
        next.transport = required(request.getTransport(), "Transport is required");
        next.notes = request.getNotes() == null ? "" : request.getNotes().trim();
        next.fromName = required(request.getFromName(), "From is required");
        next.toName = required(request.getToName(), "To is required");
        next.amount = money(request.getAmount());
        next.cash = money(request.getCashPaid());
        next.gpay = money(request.getGpayPaid());
        next.card = money(request.getCardPaid());
        next.credit = money(request.getCredit());
        if (next.amount <= 0) {
            throw new RuntimeException("Please enter a valid ticket amount");
        }
        if (next.cash < 0 || next.gpay < 0 || next.card < 0 || next.credit < 0) {
            throw new RuntimeException("Payment amounts cannot be negative");
        }
        if (Math.abs((next.cash + next.gpay + next.card + next.credit) - next.amount) > 0.01) {
            throw new RuntimeException("Cash + GPay + Card + Credit must equal the ticket amount");
        }
        next.dateTime = entryDateTime(request.getEntryDate(), request.getEntryTime());
        return next;
    }

    private void writeLedger(long ticketId, long customerId, double amount, double cash, double gpay, double card,
                             Long uid, String dateTime) {
        double bank = money(gpay + card);
        int payMode = cash > 0 && bank > 0 ? 3 : bank > 0 ? 2 : 1;
        int payType = gpay > 0 && card > 0 ? 3 : gpay > 0 ? 1 : card > 0 ? 2 : 0;
        int n = jdbcTemplate.update(
                "UPDATE prod_ledger SET customer_id = ?, payment_mode = ?, bill_amount = ?, cash_paid = ?, bank_paid = ?, "
                        + "payment_type = ?, uid = ?, date_time = ? WHERE bill_type = 13 AND bill_id = ?",
                customerId, payMode, amount, cash, bank, payType, uid, dateTime, ticketId
        );
        if (n == 0) {
            jdbcTemplate.update(
                    "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) "
                            + "VALUES (13, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)",
                    ticketId, customerId, payMode, amount, cash, bank, payType, uid, dateTime
            );
        }
    }

    private void logTicket(long ticketId, String docNo, String action, String details, Long uid) {
        jdbcTemplate.update(
                "INSERT INTO ticket_edit_log (ticket_id, doc_no, action, details, uid, date, time) "
                        + "VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME())",
                ticketId, docNo, action, details, uid
        );
    }

    private double adjustCredit(long customerId, double delta) {
        ensureAccount(customerId);
        if (Math.abs(delta) > 0.001) {
            jdbcTemplate.update(
                    "UPDATE customer_account SET balance = balance + ? WHERE customer_id = ?",
                    delta, customerId
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

    private double num(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        return 0;
    }

    private String str(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String rupee(double value) {
        return "₹" + String.format("%.2f", value);
    }

    private static class ParsedTicket {
        String transport;
        String notes;
        String fromName;
        String toName;
        double amount;
        double cash;
        double gpay;
        double card;
        double credit;
        String dateTime;
    }
}
