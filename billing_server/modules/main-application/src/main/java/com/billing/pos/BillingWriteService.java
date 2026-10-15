package com.billing.pos;

import com.billing.admin.AdminService;
import com.billing.pos.dto.BillLineRequest;
import com.billing.pos.dto.HoldBillRequest;
import com.billing.pos.dto.SaveBillRequest;
import com.billing.pos.dto.SaveBillResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.Calendar;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BillingWriteService {

    private final JdbcTemplate jdbcTemplate;
    private final BillingReadService readService;
    private final AdminService adminService;

    @Transactional
    public SaveBillResponse saveBill(SaveBillRequest request, Long uid) {
        if (request.getProducts() == null || request.getProducts().isEmpty()) {
            throw new RuntimeException("Empty Bill. Please Prepare Bill And Save.");
        }
        Long customerId = resolveCustomer(request);
        int isTaxBill = request.getIsTaxBill() == null ? 1 : request.getIsTaxBill();
        String billNo = nextBillNumber(isTaxBill);
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double totalPaid = cashPaid + bankPaid;
        double payableAmt = nz(request.getPayableAmount());
        double balance = dueAmount(totalPaid, payableAmt, customerId);
        int mode = request.getMode() == null ? 1 : request.getMode();
        int type = request.getType() == null ? 0 : request.getType();
        int priceCategory = request.getPriceCategory() == null ? 3 : request.getPriceCategory();
        String customerName = blankToDash(request.getCustomerName());
        String customerPhn = blankToDash(request.getCustomerPhn());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO prod_bill (bill_display, total, extraDisc, exchPoint, payable, paid, uid, DATE, TIME, cusName, prodDisc, cusPhn, " +
                            "paymentMode, paymentType, balance, is_balance, currentBalance, customerId, price_category, attender_id, is_tax_bill) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, billNo);
            ps.setDouble(2, nz(request.getPriceTotal()));
            ps.setDouble(3, nz(request.getFinalDiscount()));
            ps.setDouble(4, nz(request.getExchangePointUsed()));
            ps.setDouble(5, nz(request.getPayableAmount()));
            ps.setDouble(6, totalPaid);
            ps.setLong(7, uid);
            ps.setString(8, customerName);
            ps.setDouble(9, nz(request.getDiscountTotal()));
            ps.setString(10, customerPhn);
            ps.setInt(11, mode);
            ps.setInt(12, type);
            ps.setDouble(13, balance);
            ps.setInt(14, balance > 0 ? 1 : 0);
            ps.setDouble(15, balance);
            if (customerId != null && customerId > 0) {
                ps.setLong(16, customerId);
            } else {
                ps.setNull(16, java.sql.Types.INTEGER);
            }
            ps.setInt(17, priceCategory);
            if (request.getAttenderId() != null && request.getAttenderId() > 0) {
                ps.setLong(18, request.getAttenderId());
            } else {
                ps.setNull(18, java.sql.Types.INTEGER);
            }
            ps.setInt(19, isTaxBill);
            return ps;
        }, keyHolder);
        long billId = requireGeneratedId(keyHolder);

        for (BillLineRequest line : request.getProducts()) {
            int gst = isTaxBill == 1 ? productGst(line.getId()) : 0;
            double cost = productCost(line.getId(), line.getBatchId());
            jdbcTemplate.update(
                    "INSERT INTO prod_bill_details (bill_id, prod_id, qty, price, disc, total, gst, cost, commission) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    billId, line.getId(), line.getQty(), line.getPrice(), nz(line.getDiscount()),
                    nz(line.getTotal()), gst, cost, nz(line.getCommission())
            );
        }

        jdbcTemplate.update(
                "INSERT INTO prod_bill_payment (bill_id, cash, bank, paymentType) VALUES (?, ?, ?, ?)",
                billId, cashPaid, bankPaid, type
        );

        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                1, billId,
                customerId != null && customerId > 0 ? customerId : null,
                null, mode, nz(request.getPayableAmount()), cashPaid, bankPaid, type, uid
        );

        if (balance > 0 && customerId != null && customerId > 0) {
            addDueToCustomerAccount(customerId, balance);
        }

        boolean canBillWithoutStock = Boolean.TRUE.equals(readService.options(uid).getCanBillWithoutStock());
        for (BillLineRequest line : request.getProducts()) {
            updateStock(line.getId(), BigDecimal.valueOf(nz(line.getQty())), uid, line.getBatchId(), billId, "WHILE BILLING", canBillWithoutStock);
            try {
                reduceComponentStock(line.getId(), BigDecimal.valueOf(nz(line.getQty())), uid, billId, canBillWithoutStock);
            } catch (Exception ignored) {
                // BOM table may be empty; do not fail the bill
            }
        }

        if (request.getQuotationId() != null && request.getQuotationId() > 0) {
            jdbcTemplate.update("UPDATE prod_quotation SET is_billed = 1 WHERE id = ?", request.getQuotationId());
        }
        if (nz(request.getExchangePointUsed()) > 0 && customerId != null && customerId > 0) {
            useExchangePoint(customerId, billId, request.getExchangePointUsed(), uid);
        }

        return new SaveBillResponse(billNo, billId);
    }

    @Transactional
    public Map<String, Object> saveHold(HoldBillRequest request, Long uid) {
        if (request.getProducts() == null || request.getProducts().isEmpty()) {
            throw new RuntimeException("Empty hold. Add products first.");
        }
        if (request.getQuotationId() != null && request.getQuotationId() > 0) {
            return updateHold(request, uid);
        }
        int year = LocalDate.now().getYear() % 100;
        Integer maxId = jdbcTemplate.query(
                "SELECT MAX(id) AS maxId FROM prod_quotation WHERE YEAR(date) = YEAR(CURDATE())",
                rs -> rs.next() ? rs.getInt("maxId") : 0
        );
        String quotNo = "Q" + year + "-" + ((maxId == null ? 0 : maxId) + 1);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO prod_quotation (bill_display, total, prodDisc, extraDisc, payable, cusName, cusPhn, customerId, date, time, uid, is_billed, is_cancelled, is_tax_bill, is_commission) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 0, 0, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, quotNo);
            ps.setDouble(2, nz(request.getPriceTotal()));
            ps.setDouble(3, nz(request.getDiscountTotal()));
            ps.setDouble(4, nz(request.getFinalDiscount()));
            ps.setDouble(5, nz(request.getPayableAmount()));
            ps.setString(6, blankToDash(request.getCustomerName()));
            ps.setString(7, blankToDash(request.getCustomerPhn()));
            if (request.getCustomerId() != null && request.getCustomerId() > 0) {
                ps.setLong(8, request.getCustomerId());
            } else {
                ps.setNull(8, java.sql.Types.INTEGER);
            }
            ps.setLong(9, uid);
            ps.setInt(10, request.getIsTaxBill() == null ? 1 : request.getIsTaxBill());
            ps.setInt(11, request.getIsEligibleForCommission() != null && request.getIsEligibleForCommission() == 1 ? 1 : 0);
            return ps;
        }, keyHolder);
        long quotId = requireGeneratedId(keyHolder);
        int isTaxBill = request.getIsTaxBill() == null ? 1 : request.getIsTaxBill();
        for (BillLineRequest line : request.getProducts()) {
            int gst = isTaxBill == 1 ? productGst(line.getId()) : 0;
            jdbcTemplate.update(
                    "INSERT INTO prod_quotation_details (quot_id, prod_id, qty, price, disc, total, gst, is_cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
                    quotId, line.getId(), line.getQty(), line.getPrice(), nz(line.getDiscount()), nz(line.getTotal()), gst
            );
        }
        return Map.of("quotNo", quotNo, "quotId", quotId);
    }

    private Map<String, Object> updateHold(HoldBillRequest request, Long uid) {
        Long quotId = request.getQuotationId();
        List<String> existing = jdbcTemplate.query(
                "SELECT bill_display FROM prod_quotation WHERE id = ? AND is_cancelled = 0 AND is_billed = 0",
                (rs, i) -> rs.getString(1),
                quotId
        );
        if (existing.isEmpty()) {
            throw new RuntimeException("Hold not found or already billed.");
        }
        String quotNo = existing.get(0);
        jdbcTemplate.update(
                "UPDATE prod_quotation SET total=?, prodDisc=?, extraDisc=?, payable=?, cusName=?, cusPhn=?, customerId=?, date=NOW(), time=NOW(), uid=?, is_tax_bill=?, is_commission=? " +
                        "WHERE id=?",
                nz(request.getPriceTotal()),
                nz(request.getDiscountTotal()),
                nz(request.getFinalDiscount()),
                nz(request.getPayableAmount()),
                blankToDash(request.getCustomerName()),
                blankToDash(request.getCustomerPhn()),
                request.getCustomerId() != null && request.getCustomerId() > 0 ? request.getCustomerId() : null,
                uid,
                request.getIsTaxBill() == null ? 1 : request.getIsTaxBill(),
                request.getIsEligibleForCommission() != null && request.getIsEligibleForCommission() == 1 ? 1 : 0,
                quotId
        );
        jdbcTemplate.update("UPDATE prod_quotation_details SET is_cancelled = 1 WHERE quot_id = ?", quotId);
        int isTaxBill = request.getIsTaxBill() == null ? 1 : request.getIsTaxBill();
        for (BillLineRequest line : request.getProducts()) {
            int gst = isTaxBill == 1 ? productGst(line.getId()) : 0;
            jdbcTemplate.update(
                    "INSERT INTO prod_quotation_details (quot_id, prod_id, qty, price, disc, total, gst, is_cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
                    quotId, line.getId(), line.getQty(), line.getPrice(), nz(line.getDiscount()), nz(line.getTotal()), gst
            );
        }
        return Map.of("quotNo", quotNo, "quotId", quotId);
    }

    @Transactional
    public void cancelHold(Long quotId) {
        jdbcTemplate.update("UPDATE prod_quotation SET is_cancelled = 1 WHERE id = ?", quotId);
    }

    private double dueAmount(double totalPaid, double payableAmt, Long customerId) {
        if (totalPaid < -0.001) {
            throw new RuntimeException("Paid amount cannot be negative.");
        }
        if (totalPaid > payableAmt + 0.001) {
            throw new RuntimeException("Paid amount cannot be more than payable amount.");
        }
        double due = Math.max(0, payableAmt - totalPaid);
        if (due > 0.001 && (customerId == null || customerId <= 0)) {
            throw new RuntimeException("Enter customer name for due / balance payment.");
        }
        return due;
    }

    private Long resolveCustomer(SaveBillRequest request) {
        Long customerId = request.getCustomerId() == null ? 0L : request.getCustomerId();
        String name = request.getCustomerName();
        if (name == null || name.isBlank() || "-".equals(name.trim())) {
            return customerId > 0 ? customerId : 0L;
        }
        if (customerId > 0) {
            return customerId;
        }
        List<Long> existing = jdbcTemplate.query(
                "SELECT id FROM customers WHERE name = ? LIMIT 1",
                (rs, i) -> rs.getLong(1),
                name.trim()
        );
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO customers(name, date, time, address, phone_number, gstin, is_gst, is_eligible_for_commission) VALUES (?, NOW(), NOW(), '', ?, '', 0, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, name.trim());
            ps.setString(2, request.getCustomerPhn() == null ? "" : request.getCustomerPhn());
            ps.setInt(3, request.getIsEligibleForCommission() == null ? 0 : request.getIsEligibleForCommission());
            return ps;
        }, keyHolder);
        long newId = requireGeneratedId(keyHolder);
        jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", newId);
        return newId;
    }

    private String nextBillNumber(int isTaxBill) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(id) FROM prod_bill WHERE YEAR(DATE) = YEAR(CURDATE()) AND is_tax_bill = ?",
                Integer.class,
                isTaxBill
        );
        int nextId = (count == null ? 0 : count) + 1;
        if (isTaxBill == 1) {
            int year = Calendar.getInstance().get(Calendar.YEAR) % 100;
            return year + "-" + nextId;
        }
        return String.valueOf(nextId);
    }

    @Transactional
    public SaveBillResponse updateBill(Long billId, SaveBillRequest request, Long uid) {
        if (billId == null || billId <= 0) {
            throw new RuntimeException("Bill id is required");
        }
        if (request.getProducts() == null || request.getProducts().isEmpty()) {
            throw new RuntimeException("Empty Bill. Please Prepare Bill And Save.");
        }
        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT id, bill_display, customerId, currentBalance, payable, paid, extraDisc, prodDisc, " +
                        "paymentMode, paymentType, cusName, is_tax_bill FROM prod_bill " +
                        "WHERE id = ? AND IFNULL(is_cancelled, 0) = 0",
                billId
        );
        if (existing.isEmpty()) {
            throw new RuntimeException("Bill not found or has been cancelled");
        }
        Map<String, Object> old = existing.get(0);
        String billNo = String.valueOf(old.get("bill_display"));
        long oldCustomerId = toLong(old.get("customerId"));
        double oldDue = toDouble(old.get("currentBalance"));
        List<Map<String, Object>> oldLines = jdbcTemplate.queryForList(
                "SELECT p.code, d.qty, d.price FROM prod_bill_details d JOIN prod_product p ON p.id = d.prod_id WHERE d.bill_id = ?",
                billId
        );
        List<Map<String, Object>> oldPayRows = jdbcTemplate.queryForList(
                "SELECT IFNULL(cash,0) AS cash, IFNULL(bank,0) AS bank FROM prod_bill_payment WHERE bill_id = ? LIMIT 1",
                billId
        );
        double oldCash = oldPayRows.isEmpty() ? 0 : toDouble(oldPayRows.get(0).get("cash"));
        double oldBank = oldPayRows.isEmpty() ? 0 : toDouble(oldPayRows.get(0).get("bank"));

        reverseCustomerDue(oldCustomerId, oldDue);
        restoreBillStock(billId, uid);

        Long customerId = resolveCustomer(request);
        int isTaxBill = request.getIsTaxBill() == null ? 1 : request.getIsTaxBill();
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double totalPaid = cashPaid + bankPaid;
        double payableAmt = nz(request.getPayableAmount());
        double balance = dueAmount(totalPaid, payableAmt, customerId);
        int mode = request.getMode() == null ? 1 : request.getMode();
        int type = request.getType() == null ? 0 : request.getType();
        int priceCategory = request.getPriceCategory() == null ? 3 : request.getPriceCategory();
        String customerName = blankToDash(request.getCustomerName());
        String customerPhn = blankToDash(request.getCustomerPhn());

        jdbcTemplate.update(
                "UPDATE prod_bill SET total = ?, extraDisc = ?, exchPoint = ?, payable = ?, paid = ?, cusName = ?, prodDisc = ?, cusPhn = ?, " +
                        "paymentMode = ?, paymentType = ?, balance = ?, is_balance = ?, currentBalance = ?, customerId = ?, " +
                        "price_category = ?, attender_id = ?, is_tax_bill = ? WHERE id = ?",
                nz(request.getPriceTotal()),
                nz(request.getFinalDiscount()),
                nz(request.getExchangePointUsed()),
                payableAmt,
                totalPaid,
                customerName,
                nz(request.getDiscountTotal()),
                customerPhn,
                mode,
                type,
                balance,
                balance > 0 ? 1 : 0,
                balance,
                customerId != null && customerId > 0 ? customerId : null,
                priceCategory,
                request.getAttenderId() != null && request.getAttenderId() > 0 ? request.getAttenderId() : null,
                isTaxBill,
                billId
        );

        jdbcTemplate.update("DELETE FROM prod_bill_details WHERE bill_id = ?", billId);
        for (BillLineRequest line : request.getProducts()) {
            int gst = isTaxBill == 1 ? productGst(line.getId()) : 0;
            double cost = productCost(line.getId(), line.getBatchId());
            jdbcTemplate.update(
                    "INSERT INTO prod_bill_details (bill_id, prod_id, qty, price, disc, total, gst, cost, commission) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    billId, line.getId(), line.getQty(), line.getPrice(), nz(line.getDiscount()),
                    nz(line.getTotal()), gst, cost, nz(line.getCommission())
            );
        }

        int payUpdated = jdbcTemplate.update(
                "UPDATE prod_bill_payment SET cash = ?, bank = ?, paymentType = ? WHERE bill_id = ?",
                cashPaid, bankPaid, type, billId
        );
        if (payUpdated == 0) {
            jdbcTemplate.update(
                    "INSERT INTO prod_bill_payment (bill_id, cash, bank, paymentType) VALUES (?, ?, ?, ?)",
                    billId, cashPaid, bankPaid, type
            );
        }

        int ledgerUpdated = jdbcTemplate.update(
                "UPDATE prod_ledger SET customer_id = ?, payment_mode = ?, bill_amount = ?, cash_paid = ?, bank_paid = ?, payment_type = ?, uid = ? " +
                        "WHERE bill_type = 1 AND bill_id = ?",
                customerId != null && customerId > 0 ? customerId : null,
                mode, nz(request.getPayableAmount()), cashPaid, bankPaid, type, uid, billId
        );
        if (ledgerUpdated == 0) {
            jdbcTemplate.update(
                    "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    1, billId,
                    customerId != null && customerId > 0 ? customerId : null,
                    null, mode, nz(request.getPayableAmount()), cashPaid, bankPaid, type, uid
            );
        }

        if (balance > 0 && customerId != null && customerId > 0) {
            addDueToCustomerAccount(customerId, balance);
        }

        boolean canBillWithoutStock = Boolean.TRUE.equals(readService.options(uid).getCanBillWithoutStock());
        for (BillLineRequest line : request.getProducts()) {
            updateStock(line.getId(), BigDecimal.valueOf(nz(line.getQty())), uid, line.getBatchId(), billId, "WHILE EDIT BILL", canBillWithoutStock);
            try {
                reduceComponentStock(line.getId(), BigDecimal.valueOf(nz(line.getQty())), uid, billId, canBillWithoutStock);
            } catch (Exception ignored) {
                // BOM table may be empty; do not fail the bill
            }
        }

        adminService.logBillAction(billId, billNo, "EDIT", editSummary(old, oldLines, oldCash, oldBank, request, cashPaid, bankPaid), uid);
        return new SaveBillResponse(billNo, billId);
    }

    private void reverseCustomerDue(long customerId, double dueAmount) {
        if (customerId <= 0 || dueAmount <= 0) {
            return;
        }
        int rows = jdbcTemplate.update(
                "UPDATE customer_account SET balance = GREATEST(0, balance - ?) WHERE customer_id = ?",
                dueAmount, customerId
        );
        if (rows == 0) {
            jdbcTemplate.update(
                    "INSERT INTO customer_account (customer_id, advance, balance) VALUES (?, 0.00, 0.00)",
                    customerId
            );
        }
    }

    private void restoreBillStock(long billId, Long uid) {
        List<Map<String, Object>> lines = jdbcTemplate.queryForList(
                "SELECT prod_id, qty FROM prod_bill_details WHERE bill_id = ?",
                billId
        );
        for (Map<String, Object> line : lines) {
            long prodId = toLong(line.get("prod_id"));
            BigDecimal qty = toBd(line.get("qty"));
            Integer zero = jdbcTemplate.query(
                    "SELECT 1 FROM prod_lifecycle WHERE bill_id = ? AND product_id = ? AND is_zero_stock_bill = 1 LIMIT 1",
                    rs -> rs.next() ? 1 : 0,
                    billId, prodId
            );
            if (zero != null && zero == 1) {
                continue;
            }
            Long batchId = jdbcTemplate.query(
                    "SELECT batch_id FROM prod_lifecycle WHERE bill_id = ? AND product_id = ? AND IFNULL(stock_out, 0) > 0 ORDER BY id DESC LIMIT 1",
                    rs -> rs.next() ? rs.getLong(1) : null,
                    billId, prodId
            );
            if (batchId == null) {
                batchId = jdbcTemplate.query(
                        "SELECT id FROM prod_batch WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                        rs -> rs.next() ? rs.getLong(1) : null,
                        prodId
                );
            }
            if (batchId == null) {
                continue;
            }
            jdbcTemplate.update("UPDATE prod_batch SET stock = stock + ? WHERE id = ?", qty, batchId);
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, product_id, stock_in, stock_out, stock_now, notes, date, time, uid, stock_type, stockAdjType, bill_id) " +
                            "VALUES (?, ?, ?, 0, ?, ?, CURDATE(), CURTIME(), ?, 1, 1, ?)",
                    batchId, prodId, qty, lastStockNow(prodId).add(qty), "Edit bill - returned to stock", uid, billId
            );
        }
    }

    private BigDecimal lastStockNow(Long productId) {
        BigDecimal value = jdbcTemplate.query(
                "SELECT stock_now FROM prod_lifecycle WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                productId
        );
        return value == null ? BigDecimal.ZERO : value;
    }

    private String editSummary(Map<String, Object> old, List<Map<String, Object>> oldLines,
                               double oldCash, double oldBank, SaveBillRequest request,
                               double cashPaid, double bankPaid) {
        StringBuilder sb = new StringBuilder();
        sb.append("Payable ").append(fmt(toDouble(old.get("payable"))))
                .append(" → ").append(fmt(nz(request.getPayableAmount())))
                .append(". Cash ").append(fmt(oldCash)).append(" → ").append(fmt(cashPaid))
                .append(". Bank ").append(fmt(oldBank)).append(" → ").append(fmt(bankPaid))
                .append(". Extra disc ").append(fmt(toDouble(old.get("extraDisc"))))
                .append(" → ").append(fmt(nz(request.getFinalDiscount())))
                .append(". Items before: ").append(itemSummary(oldLines))
                .append(". Items after: ").append(newItemSummary(request.getProducts()));
        String text = sb.toString();
        return text.length() > 1800 ? text.substring(0, 1800) : text;
    }

    private String itemSummary(List<Map<String, Object>> lines) {
        if (lines == null || lines.isEmpty()) {
            return "-";
        }
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> line : lines) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(line.get("code")).append(" x").append(fmt(toDouble(line.get("qty"))))
                    .append(" @").append(fmt(toDouble(line.get("price"))));
        }
        return sb.toString();
    }

    private String newItemSummary(List<BillLineRequest> lines) {
        if (lines == null || lines.isEmpty()) {
            return "-";
        }
        StringBuilder sb = new StringBuilder();
        for (BillLineRequest line : lines) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(line.getId()).append(" x").append(fmt(nz(line.getQty())))
                    .append(" @").append(fmt(nz(line.getPrice())));
        }
        return sb.toString();
    }

    private String fmt(double value) {
        return String.format("%.2f", value);
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private double toDouble(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private BigDecimal toBd(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private void addDueToCustomerAccount(Long customerId, double dueAmount) {
        int rows = jdbcTemplate.update(
                "UPDATE customer_account SET balance = balance + ? WHERE customer_id = ?",
                dueAmount, customerId
        );
        if (rows == 0) {
            jdbcTemplate.update(
                    "INSERT INTO customer_account (customer_id, advance, balance) VALUES (?, 0.00, ?)",
                    customerId, dueAmount
            );
        }
    }

    private void updateStock(Long productId, BigDecimal qty, Long uid, Long batchId, long billId, String notes, boolean canBillWithoutStock) {
        if (productId == null || batchId == null || batchId == 0) {
            return;
        }
        BigDecimal currentStock = jdbcTemplate.query(
                "SELECT stock FROM prod_batch WHERE product_id = ? AND id = ?",
                rs -> rs.next() ? rs.getBigDecimal("stock") : BigDecimal.ZERO,
                productId, batchId
        );
        if (currentStock == null) {
            currentStock = BigDecimal.ZERO;
        }
        BigDecimal lastStockNow = jdbcTemplate.query(
                "SELECT stock_now FROM prod_lifecycle WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getBigDecimal("stock_now") : BigDecimal.ZERO,
                productId
        );
        if (lastStockNow == null) {
            lastStockNow = BigDecimal.ZERO;
        }

        if (currentStock.compareTo(qty) >= 0) {
            jdbcTemplate.update(
                    "UPDATE prod_batch SET stock = stock - ? WHERE product_id = ? AND id = ?",
                    qty, productId, batchId
            );
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_out, stock_now, notes, DATE, TIME, product_id, uid, bill_id) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)",
                    batchId, qty, lastStockNow.subtract(qty), notes, productId, uid, billId
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO prod_batch_zero_stock_bill (batch_id, qty, date, time, product_id, uid) VALUES (?, ?, NOW(), NOW(), ?, ?)",
                    batchId, qty, productId, uid
            );
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_out, stock_now, notes, DATE, TIME, product_id, uid, is_zero_stock_bill, bill_id) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, 1, ?)",
                    batchId, qty, lastStockNow, notes.contains("Bill of Materials") ? notes : " BILL WITHOUT STOCK", productId, uid, billId
            );
        }
    }

    private void reduceComponentStock(Long productId, BigDecimal qty, Long uid, long billId, boolean canBillWithoutStock) {
        List<Map<String, Object>> components = jdbcTemplate.queryForList(
                "SELECT c.quantity, p.id AS comp_prod_id, p.name FROM prod_product_components c " +
                        "JOIN prod_product p ON c.component_product_id = p.id " +
                        "WHERE c.product_id = ? AND p.is_active = 1",
                productId
        );
        if (components.isEmpty()) {
            return;
        }
        String productName = jdbcTemplate.query(
                "SELECT name FROM prod_product WHERE id = ?",
                rs -> rs.next() ? rs.getString(1) : "",
                productId
        );
        for (Map<String, Object> comp : components) {
            Long componentProductId = ((Number) comp.get("comp_prod_id")).longValue();
            double componentQty = ((Number) comp.get("quantity")).doubleValue();
            BigDecimal totalComponentQty = qty.multiply(BigDecimal.valueOf(componentQty));
            Long componentBatchId = jdbcTemplate.query(
                    "SELECT id FROM prod_batch WHERE product_id = ? AND stock > 0 ORDER BY id LIMIT 1",
                    rs -> rs.next() ? rs.getLong(1) : 0L,
                    componentProductId
            );
            if (componentBatchId != null && componentBatchId > 0) {
                updateStock(componentProductId, totalComponentQty, uid, componentBatchId, billId,
                        "Bill of Materials: " + productName, canBillWithoutStock);
            }
        }
    }

    private void useExchangePoint(Long customerId, long billId, double pointsUsed, Long uid) {
        Double oldPoint = jdbcTemplate.query(
                "SELECT IFNULL(exchange_point, 0) FROM customers WHERE id = ?",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                customerId
        );
        double actualDeduct = Math.min(pointsUsed, oldPoint == null ? 0 : oldPoint);
        double newPoint = BigDecimal.valueOf((oldPoint == null ? 0 : oldPoint) - actualDeduct)
                .setScale(3, RoundingMode.HALF_UP).doubleValue();
        if (newPoint < 0) {
            newPoint = 0;
        }
        jdbcTemplate.update("UPDATE customers SET exchange_point = ? WHERE id = ?", newPoint, customerId);
        jdbcTemplate.update(
                "INSERT INTO customers_exchange_point (customer_id, bill_id, old_point, exchange_point, total_point, uid, date_time, notes) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                customerId, billId, oldPoint, -actualDeduct, newPoint, uid,
                "Exchange point used as bill credit (Bill ID: " + billId + ", Used: " + String.format("%.2f", actualDeduct) + ")"
        );
    }

    private int productGst(Long productId) {
        Integer gst = jdbcTemplate.query(
                "SELECT gst FROM prod_product WHERE id = ?",
                rs -> rs.next() ? rs.getInt(1) : 0,
                productId
        );
        return gst == null ? 0 : gst;
    }

    private double productCost(Long productId, Long batchId) {
        if (productId == null || batchId == null) {
            return 0;
        }
        Double cost = jdbcTemplate.query(
                "SELECT cost FROM prod_batch WHERE product_id = ? AND id = ?",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                productId, batchId
        );
        return cost == null ? 0 : cost;
    }

    private long requireGeneratedId(KeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create record");
        }
        return key.longValue();
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private String blankToDash(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }
}
