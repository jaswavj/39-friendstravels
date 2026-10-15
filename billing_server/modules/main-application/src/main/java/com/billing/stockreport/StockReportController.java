package com.billing.stockreport;

import com.billing.common.JdbcPageHelper;
import com.billing.core.response.ResponseDO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/stock-reports")
public class StockReportController {

    private final StockReportService stockReportService;

    @GetMapping("/products")
    public ResponseDO products() {
        return ok(stockReportService.products());
    }

    @GetMapping("/current-stock")
    public ResponseDO currentStock(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(stockReportService.currentStock(), page, size));
    }

    @GetMapping("/transactions")
    public ResponseDO transactions(@RequestParam String from,
                                   @RequestParam String to,
                                   @RequestParam(required = false) Long productId,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(stockReportService.transactions(from, to, productId), page, size));
    }

    @GetMapping("/adjustments")
    public ResponseDO adjustments(@RequestParam String from,
                                  @RequestParam String to,
                                  @RequestParam(required = false) Long productId,
                                  @RequestParam(required = false) Integer stockType,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "25") int size) {
        return ok(JdbcPageHelper.slice(stockReportService.adjustments(from, to, productId, stockType), page, size));
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
