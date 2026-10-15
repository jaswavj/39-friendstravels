package com.billing.accountreport;

import com.billing.common.JdbcPageHelper;
import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/account-reports")
public class AccountReportController {

    private final AccountReportService accountReportService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/sales")
    public ResponseDO sales(@RequestParam String from,
                            @RequestParam String to,
                            @RequestParam(required = false, defaultValue = "0") Integer mode,
                            @RequestParam(required = false, defaultValue = "0") Integer type,
                            @RequestParam(required = false, defaultValue = "0") Long userId,
                            @RequestParam(required = false, defaultValue = "0") Integer taxBill,
                            @RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "25") int size) {
        var data = accountReportService.sales(from, to, mode, type, userId, taxBill);
        data.put("bills", JdbcPageHelper.slice((java.util.List<?>) data.get("bills"), page, size));
        data.put("dues", JdbcPageHelper.slice((java.util.List<?>) data.get("dues"), page, size));
        return ok(data);
    }

    @GetMapping("/sales-by-category")
    public ResponseDO salesByCategory(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam Long categoryId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.lineSales(from, to, "category", categoryId), page, size));
    }

    @GetMapping("/sales-by-department")
    public ResponseDO salesByDepartment(@RequestParam String from,
                                        @RequestParam String to,
                                        @RequestParam Long brandId,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.lineSales(from, to, "brand", brandId), page, size));
    }

    @GetMapping("/sales-by-item")
    public ResponseDO salesByItem(@RequestParam String from,
                                  @RequestParam String to,
                                  @RequestParam Long productId,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.lineSales(from, to, "product", productId), page, size));
    }

    @GetMapping("/sales-by-customer")
    public ResponseDO salesByCustomer(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam Long customerId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.salesByCustomer(from, to, customerId), page, size));
    }

    @GetMapping("/sales-by-attender")
    public ResponseDO salesByAttender(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam(required = false, defaultValue = "0") Long attenderId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.salesByAttender(from, to, attenderId), page, size));
    }

    @GetMapping("/day-account")
    public ResponseDO dayAccount(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.dayAccount(from, to));
    }

    @GetMapping("/day-book")
    public ResponseDO dayBook(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.dayBook(from, to));
    }

    @GetMapping("/day-book/opening-balances")
    public ResponseDO openingBalances() {
        return ok(accountReportService.openingBalances());
    }

    @PostMapping("/day-book/opening-balance")
    public ResponseDO saveOpeningBalance(@RequestBody OpeningBalanceRequest request) {
        return ok(accountReportService.saveOpeningBalance(request, currentUserId()));
    }

    @GetMapping("/commission")
    public ResponseDO commission(@RequestParam String from,
                                 @RequestParam String to,
                                 @RequestParam Long customerId,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.commission(from, to, customerId), page, size));
    }

    @GetMapping("/commission-customers")
    public ResponseDO commissionCustomers() {
        return ok(accountReportService.commissionCustomers());
    }

    @GetMapping("/gst/sales-summary")
    public ResponseDO gstSalesSummary(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.gstSalesSummary(from, to), page, size));
    }

    @GetMapping("/gst/bill-wise")
    public ResponseDO gstBillWise(@RequestParam String from,
                                  @RequestParam String to,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.gstBillWise(from, to), page, size));
    }

    @GetMapping("/gst/item-wise")
    public ResponseDO gstItemWise(@RequestParam String from,
                                  @RequestParam String to,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.gstItemWise(from, to), page, size));
    }

    @GetMapping("/gst/hsn")
    public ResponseDO gstHsn(@RequestParam String from,
                             @RequestParam String to,
                             @RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.gstHsn(from, to), page, size));
    }

    @GetMapping("/gst/gstr1")
    public ResponseDO gstr1(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstr1(from, to));
    }

    @GetMapping("/gst/purchase")
    public ResponseDO gstPurchase(@RequestParam String from,
                                  @RequestParam String to,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.gstPurchase(from, to), page, size));
    }

    @GetMapping("/gst/purchase-summary")
    public ResponseDO gstPurchaseSummary(@RequestParam String from,
                                         @RequestParam String to,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(accountReportService.gstPurchaseSummary(from, to), page, size));
    }

    private Long currentUserId() {
        return securityContext.authenticateUser().getId();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
