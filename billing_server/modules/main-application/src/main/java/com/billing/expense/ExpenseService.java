package com.billing.expense;

import com.billing.admin.dto.EditLogRow;
import com.billing.common.JdbcPageHelper;
import com.billing.core.pagination.PageResult;
import com.billing.expense.dto.ExpenseCancelRequest;
import com.billing.expense.dto.ExpenseReportRow;
import com.billing.expense.dto.ExpenseSaveRequest;
import com.billing.expense.dto.ExpenseTypeData;
import com.billing.expense.dto.ExpenseTypeSaveRequest;
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
public class ExpenseService {

    private final JdbcTemplate jdbcTemplate;

    public List<ExpenseTypeData> types() {
        return jdbcTemplate.query(
                "SELECT id, type FROM expense_type WHERE is_active = 1 ORDER BY type",
                (rs, i) -> {
                    ExpenseTypeData row = new ExpenseTypeData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("type"));
                    return row;
                }
        );
    }

    @Transactional
    public void saveType(ExpenseTypeSaveRequest request) {
        String name = required(request == null ? null : request.getName(), "Expense type name is required");
        Long id = request.getId();
        if (typeExists(name, id)) {
            throw new RuntimeException("Expense type already exists!");
        }
        if (id != null && id > 0) {
            int updated = jdbcTemplate.update("UPDATE expense_type SET type = ? WHERE id = ?", name, id);
            if (updated == 0) {
                throw new RuntimeException("Expense type not found");
            }
        } else {
            jdbcTemplate.update("INSERT INTO expense_type(type, is_active) VALUES (?, 1)", name);
        }
    }

    @Transactional
    public void blockType(Long id) {
        if (id == null || id <= 0) {
            throw new RuntimeException("Expense type not found");
        }
        int updated = jdbcTemplate.update("UPDATE expense_type SET is_active = 0 WHERE id = ?", id);
        if (updated == 0) {
            throw new RuntimeException("Expense type not found");
        }
    }

    @Transactional
    public Map<String, Object> saveEntry(ExpenseSaveRequest request, Long uid) {
        if (request == null || request.getExpenseType() == null || request.getExpenseType() <= 0) {
            throw new RuntimeException("Please select an expense type");
        }
        String content = required(request.getContent(), "Please enter content");
        String description = request.getDescription() == null ? "" : request.getDescription().trim();
        double qty = nz(request.getQty());
        if (qty < 0) {
            throw new RuntimeException("Qty cannot be negative");
        }
        String busName = request.getBusName() == null ? "" : request.getBusName().trim();
        String area = request.getArea() == null ? "" : request.getArea().trim();
        String customerName = request.getCustomerName() == null ? "" : request.getCustomerName().trim();
        String customerPhone = request.getCustomerPhone() == null ? "" : request.getCustomerPhone().trim();
        double amount = nz(request.getAmount());
        if (amount <= 0) {
            throw new RuntimeException("Please enter a valid amount.");
        }
        String date = required(request.getExpenseDate(), "Please select a date");
        String time = required(request.getExpenseTime(), "Please select a time");
        if (!time.contains(":")) {
            throw new RuntimeException("Please select a time");
        }
        String dateTime = date + " " + (time.length() == 5 ? time + ":00" : time);

        int payMode = request.getPayMode() == null ? 1 : request.getPayMode();
        int payType = request.getPayType() == null ? 0 : request.getPayType();
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double balance = nz(request.getBalance());
        double partyPaid = nz(request.getPartyPaid());
        if (partyPaid < 0) {
            throw new RuntimeException("Paid by party cannot be negative");
        }
        if (payMode < 1 || payMode > 3) {
            throw new RuntimeException("Invalid pay mode");
        }
        if (payMode == 1) {
            payType = 0;
            bankPaid = 0;
        } else if (cashPaid + bankPaid > 0.005 && (payType < 1 || payType > 5) && payMode != 1) {
            throw new RuntimeException("Please select a pay type");
        }
        if (Math.abs((cashPaid + bankPaid + balance + partyPaid) - amount) > 0.01) {
            throw new RuntimeException("Cash + Bank + Balance + Paid by party must equal the expense amount.");
        }
        if (payMode == 1 && cashPaid <= 0 && balance <= 0 && partyPaid <= 0) {
            throw new RuntimeException("Please enter cash paid amount.");
        }
        if (payMode == 2 && bankPaid <= 0 && balance <= 0 && partyPaid <= 0) {
            throw new RuntimeException("Please enter bank paid amount.");
        }

        Integer typeOk = jdbcTemplate.query(
                "SELECT id FROM expense_type WHERE id = ? AND is_active = 1",
                rs -> rs.next() ? 1 : 0,
                request.getExpenseType()
        );
        if (typeOk == null || typeOk == 0) {
            throw new RuntimeException("Please select an expense type");
        }

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO expense_entry(exp_type, content, description, qty, bus_name, area, customer_name, customer_phone, amount, party_paid, exc_date_time, entry_date_time, uid, is_active) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, request.getExpenseType());
            ps.setString(2, content);
            ps.setString(3, description);
            ps.setDouble(4, qty);
            ps.setString(5, busName);
            ps.setString(6, area);
            ps.setString(7, customerName);
            ps.setString(8, customerPhone);
            ps.setDouble(9, amount);
            ps.setDouble(10, partyPaid);
            ps.setString(11, dateTime);
            ps.setLong(12, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create expense entry.");
        }
        writeLedger(key.longValue(), payMode, amount, cashPaid, bankPaid, partyPaid, payType, uid);
        logExpense(key.longValue(), content, "CREATE", "Amount " + rupee(amount), uid);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", key.longValue());
        return result;
    }

    public Map<String, Object> get(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT ee.id, ee.exp_type, COALESCE(et.type, '') AS type_name, ee.content, ee.description, "
                        + "COALESCE(ee.qty, 0) AS qty, COALESCE(ee.bus_name, '') AS bus_name, COALESCE(ee.area, '') AS area, "
                        + "COALESCE(ee.customer_name, '') AS customer_name, COALESCE(ee.customer_phone, '') AS customer_phone, "
                        + "ee.amount, COALESCE(ee.party_paid, 0) AS party_paid, "
                        + "DATE_FORMAT(ee.exc_date_time, '%Y-%m-%d') AS expense_date, "
                        + "DATE_FORMAT(ee.exc_date_time, '%H:%i') AS expense_time, "
                        + "DATE_FORMAT(ee.exc_date_time, '%Y-%m-%d %H:%i') AS date_time, "
                        + "COALESCE(pl.payment_mode, 1) AS pay_mode, COALESCE(pl.payment_type, 0) AS pay_type, "
                        + "COALESCE(pl.cash_paid, 0) AS cash_paid, COALESCE(pl.bank_paid, 0) AS bank_paid "
                        + "FROM expense_entry ee "
                        + "LEFT JOIN expense_type et ON et.id = ee.exp_type "
                        + "LEFT JOIN prod_ledger pl ON pl.bill_type = 9 AND pl.bill_id = ee.id "
                        + "WHERE ee.id = ? AND ee.is_active = 1",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    double amount = rs.getDouble("amount");
                    double party = rs.getDouble("party_paid");
                    double cash = rs.getDouble("cash_paid");
                    double bank = rs.getDouble("bank_paid");
                    row.put("id", rs.getLong("id"));
                    row.put("expenseType", rs.getLong("exp_type"));
                    row.put("expenseTypeName", rs.getString("type_name"));
                    row.put("content", rs.getString("content"));
                    row.put("description", rs.getString("description"));
                    row.put("qty", rs.getDouble("qty"));
                    row.put("busName", rs.getString("bus_name"));
                    row.put("area", rs.getString("area"));
                    row.put("customerName", rs.getString("customer_name"));
                    row.put("customerPhone", rs.getString("customer_phone"));
                    row.put("amount", amount);
                    row.put("partyPaid", party);
                    row.put("expenseDate", rs.getString("expense_date"));
                    row.put("expenseTime", rs.getString("expense_time"));
                    row.put("dateTime", rs.getString("date_time"));
                    row.put("payMode", rs.getInt("pay_mode"));
                    row.put("payType", rs.getInt("pay_type"));
                    row.put("cashPaid", cash);
                    row.put("bankPaid", bank);
                    row.put("balance", Math.max(0, Math.round((amount - party - cash - bank) * 100d) / 100d));
                    return row;
                },
                id
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Expense not found");
        }
        return rows.get(0);
    }

    @Transactional
    public Map<String, Object> update(long id, ExpenseSaveRequest request, Long uid) {
        Map<String, Object> old = get(id);
        if (request == null || request.getExpenseType() == null || request.getExpenseType() <= 0) {
            throw new RuntimeException("Please select an expense type");
        }
        String content = required(request.getContent(), "Please enter content");
        String description = request.getDescription() == null ? "" : request.getDescription().trim();
        double qty = nz(request.getQty());
        if (qty < 0) {
            throw new RuntimeException("Qty cannot be negative");
        }
        String busName = request.getBusName() == null ? "" : request.getBusName().trim();
        String area = request.getArea() == null ? "" : request.getArea().trim();
        String customerName = request.getCustomerName() == null ? "" : request.getCustomerName().trim();
        String customerPhone = request.getCustomerPhone() == null ? "" : request.getCustomerPhone().trim();
        double amount = nz(request.getAmount());
        if (amount <= 0) {
            throw new RuntimeException("Please enter a valid amount.");
        }
        String date = required(request.getExpenseDate(), "Please select a date");
        String time = required(request.getExpenseTime(), "Please select a time");
        if (!time.contains(":")) {
            throw new RuntimeException("Please select a time");
        }
        String dateTime = date + " " + (time.length() == 5 ? time + ":00" : time);
        int payMode = request.getPayMode() == null ? 1 : request.getPayMode();
        int payType = request.getPayType() == null ? 0 : request.getPayType();
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double balance = nz(request.getBalance());
        double partyPaid = nz(request.getPartyPaid());
        if (partyPaid < 0) {
            throw new RuntimeException("Paid by party cannot be negative");
        }
        if (payMode < 1 || payMode > 3) {
            throw new RuntimeException("Invalid pay mode");
        }
        if (payMode == 1) {
            payType = 0;
            bankPaid = 0;
        } else if (cashPaid + bankPaid > 0.005 && (payType < 1 || payType > 5)) {
            throw new RuntimeException("Please select a pay type");
        }
        if (Math.abs((cashPaid + bankPaid + balance + partyPaid) - amount) > 0.01) {
            throw new RuntimeException("Cash + Bank + Balance + Paid by party must equal the expense amount.");
        }
        if (payMode == 1 && cashPaid <= 0 && balance <= 0 && partyPaid <= 0) {
            throw new RuntimeException("Please enter cash paid amount.");
        }
        if (payMode == 2 && bankPaid <= 0 && balance <= 0 && partyPaid <= 0) {
            throw new RuntimeException("Please enter bank paid amount.");
        }
        Integer typeOk = jdbcTemplate.query(
                "SELECT id FROM expense_type WHERE id = ?",
                rs -> rs.next() ? 1 : 0,
                request.getExpenseType()
        );
        if (typeOk == null || typeOk == 0) {
            throw new RuntimeException("Please select an expense type");
        }
        int updated = jdbcTemplate.update(
                "UPDATE expense_entry SET exp_type = ?, content = ?, description = ?, qty = ?, bus_name = ?, area = ?, "
                        + "customer_name = ?, customer_phone = ?, amount = ?, party_paid = ?, exc_date_time = ?, uid = ? "
                        + "WHERE id = ? AND is_active = 1",
                request.getExpenseType(), content, description, qty, busName, area,
                customerName, customerPhone, amount, partyPaid, dateTime, uid, id
        );
        if (updated == 0) {
            throw new RuntimeException("Expense not found");
        }
        writeLedger(id, payMode, amount, cashPaid, bankPaid, partyPaid, payType, uid);
        List<String> changes = new ArrayList<>();
        if (!str(old.get("content")).equals(content)) {
            changes.add("Content updated");
        }
        if (!str(old.get("customerName")).equalsIgnoreCase(customerName)) {
            changes.add("Customer " + str(old.get("customerName")) + " → " + (customerName.isEmpty() ? "-" : customerName));
        }
        if (Math.abs(num(old.get("amount")) - amount) > 0.01) {
            changes.add("Amount " + rupee(num(old.get("amount"))) + " → " + rupee(amount));
        }
        if (Math.abs(num(old.get("partyPaid")) - partyPaid) > 0.01) {
            changes.add("Paid by party " + rupee(num(old.get("partyPaid"))) + " → " + rupee(partyPaid));
        }
        if (Math.abs(num(old.get("cashPaid")) - cashPaid) > 0.01) {
            changes.add("Cash " + rupee(num(old.get("cashPaid"))) + " → " + rupee(cashPaid));
        }
        if (Math.abs(num(old.get("bankPaid")) - bankPaid) > 0.01) {
            changes.add("Bank " + rupee(num(old.get("bankPaid"))) + " → " + rupee(bankPaid));
        }
        if (!str(old.get("expenseDate")).equals(date) || !str(old.get("expenseTime")).equals(time.length() >= 5 ? time.substring(0, 5) : time)) {
            changes.add("Date " + str(old.get("dateTime")) + " → " + date + " " + (time.length() >= 5 ? time.substring(0, 5) : time));
        }
        if (changes.isEmpty()) {
            changes.add("Details saved");
        }
        logExpense(id, content, "EDIT", String.join(" · ", changes), uid);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        return result;
    }

    @Transactional
    public void cancel(long id, ExpenseCancelRequest request, Long uid) {
        String reason = required(request == null ? null : request.getReason(), "Reason for cancellation is required");
        Map<String, Object> expense = get(id);
        int updated = jdbcTemplate.update("UPDATE expense_entry SET is_active = 0 WHERE id = ? AND is_active = 1", id);
        if (updated == 0) {
            throw new RuntimeException("Expense not found or already cancelled");
        }
        jdbcTemplate.update("DELETE FROM prod_ledger WHERE bill_type = 9 AND bill_id = ?", id);
        logExpense(id, str(expense.get("content")), "CANCEL",
                "Cancelled · Amount " + rupee(num(expense.get("amount"))) + " · Reason: " + reason, uid);
    }

    public PageResult<EditLogRow> editLog(String from, String to, int page, int size) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return JdbcPageHelper.query(
                jdbcTemplate,
                "SELECT a.id, a.expense_id, a.doc_no, a.action, a.details, a.date, a.time, IFNULL(u.user_name, '') AS user_name "
                        + "FROM expense_edit_log a LEFT JOIN users u ON u.id = a.uid "
                        + "WHERE a.date BETWEEN ? AND ? ORDER BY a.date DESC, a.time DESC, a.id DESC",
                (rs, i) -> {
                    EditLogRow row = new EditLogRow();
                    row.setId(rs.getLong("id"));
                    row.setBillId(rs.getLong("expense_id"));
                    row.setBillNo(rs.getString("doc_no"));
                    row.setAction(rs.getString("action"));
                    row.setDetails(rs.getString("details"));
                    row.setDate(asStr(rs.getDate("date")));
                    row.setTime(asStr(rs.getTime("time")));
                    row.setUserName(rs.getString("user_name"));
                    return row;
                },
                page,
                size,
                fromDate,
                toDate
        );
    }

    public List<ExpenseReportRow> report(String from, String to, Long typeId, String customerName, String phone) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        String sql = "SELECT ee.id, ee.exc_date_time, COALESCE(et.type, 'Unknown') AS type_name, ee.content, ee.description, "
                + "COALESCE(ee.qty, 0) AS qty, COALESCE(ee.bus_name, '') AS bus_name, COALESCE(ee.area, '') AS area, "
                + "COALESCE(ee.customer_name, '') AS customer_name, COALESCE(ee.customer_phone, '') AS customer_phone, "
                + "ee.amount, COALESCE(ee.party_paid, 0) AS party_paid, "
                + "COALESCE(GREATEST(pl.bill_amount - pl.cash_paid - pl.bank_paid, 0), 0) AS balance, "
                + "COALESCE(pl.cash_paid, 0) AS cash_paid, COALESCE(pl.bank_paid, 0) AS bank_paid, "
                + "COALESCE(u.user_name, 'Unknown') AS user_name "
                + "FROM expense_entry ee "
                + "LEFT JOIN expense_type et ON ee.exp_type = et.id "
                + "LEFT JOIN users u ON ee.uid = u.id "
                + "LEFT JOIN prod_ledger pl ON pl.bill_type = 9 AND pl.bill_id = ee.id "
                + "WHERE ee.is_active = 1 AND DATE(ee.exc_date_time) BETWEEN ? AND ? ";
        List<Object> args = new ArrayList<>();
        args.add(fromDate);
        args.add(toDate);
        if (typeId != null && typeId > 0) {
            sql += "AND ee.exp_type = ? ";
            args.add(typeId);
        }
        if (customerName != null && !customerName.trim().isEmpty()) {
            sql += "AND ee.customer_name LIKE ? ";
            args.add("%" + customerName.trim() + "%");
        }
        if (phone != null && !phone.trim().isEmpty()) {
            sql += "AND ee.customer_phone LIKE ? ";
            args.add("%" + phone.trim() + "%");
        }
        sql += "ORDER BY ee.exc_date_time DESC";
        return jdbcTemplate.query(sql, (rs, i) -> {
            ExpenseReportRow row = new ExpenseReportRow();
            row.setId(rs.getLong("id"));
            row.setDateTime(asStr(rs.getObject("exc_date_time")));
            row.setTypeName(rs.getString("type_name"));
            row.setContent(rs.getString("content"));
            row.setDescription(rs.getString("description"));
            row.setQty(rs.getDouble("qty"));
            row.setBusName(rs.getString("bus_name"));
            row.setArea(rs.getString("area"));
            row.setCustomerName(rs.getString("customer_name"));
            row.setCustomerPhone(rs.getString("customer_phone"));
            row.setAmount(rs.getDouble("amount"));
            row.setPartyPaid(rs.getDouble("party_paid"));
            row.setBalance(rs.getDouble("balance"));
            row.setCashPaid(rs.getDouble("cash_paid"));
            row.setBankPaid(rs.getDouble("bank_paid"));
            row.setUserName(rs.getString("user_name"));
            return row;
        }, args.toArray());
    }

    private boolean typeExists(String name, Long excludeId) {
        List<Long> ids = excludeId != null && excludeId > 0
                ? jdbcTemplate.query("SELECT id FROM expense_type WHERE type = ? AND id != ?", (rs, i) -> rs.getLong(1), name, excludeId)
                : jdbcTemplate.query("SELECT id FROM expense_type WHERE type = ?", (rs, i) -> rs.getLong(1), name);
        return !ids.isEmpty();
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    private void writeLedger(long expenseId, int payMode, double amount, double cashPaid, double bankPaid,
                             double partyPaid, int payType, Long uid) {
        jdbcTemplate.update("DELETE FROM prod_ledger WHERE bill_type = 9 AND bill_id = ?", expenseId);
        double ledgerAmount = Math.max(0, amount - partyPaid);
        if (ledgerAmount > 0.005 || cashPaid > 0.005 || bankPaid > 0.005) {
            jdbcTemplate.update(
                    "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) "
                            + "VALUES (9, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, NOW())",
                    expenseId, payMode, ledgerAmount, cashPaid, bankPaid, payType, uid
            );
        }
    }

    private void logExpense(long expenseId, String docNo, String action, String details, Long uid) {
        jdbcTemplate.update(
                "INSERT INTO expense_edit_log (expense_id, doc_no, action, details, uid, date, time) "
                        + "VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME())",
                expenseId, docNo, action, details, uid
        );
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private double num(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return value == null ? 0 : Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String str(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private String rupee(double value) {
        return "₹" + String.format("%.2f", value);
    }

    private String asStr(Object value) {
        return value == null ? "" : value.toString();
    }
}
