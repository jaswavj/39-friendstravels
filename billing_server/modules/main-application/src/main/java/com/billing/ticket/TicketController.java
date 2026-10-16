package com.billing.ticket;

import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import com.billing.ticket.dto.TicketCancelRequest;
import com.billing.ticket.dto.TicketSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ticket")
public class TicketController {

    private final TicketService ticketService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/customers/search")
    public ResponseDO searchCustomers(@RequestParam(required = false) String query,
                                      @RequestParam(required = false) String phone) {
        return ok(ticketService.searchCustomers(query, phone));
    }

    @GetMapping("/places")
    public ResponseDO searchPlaces(@RequestParam(required = false) String q) {
        return ok(ticketService.searchPlaces(q));
    }

    @GetMapping("/income-types")
    public ResponseDO searchIncomeTypes(@RequestParam(required = false) String q) {
        return ok(ticketService.searchIncomeTypes(q));
    }

    @GetMapping("/report")
    public ResponseDO report(@RequestParam String from,
                             @RequestParam String to,
                             @RequestParam(required = false) String customerName,
                             @RequestParam(required = false) String phone,
                             @RequestParam(required = false) String kind,
                             @RequestParam(required = false) String incomeType,
                             @RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "25") int size) {
        return ok(ticketService.report(from, to, customerName, phone, kind, incomeType, page, size));
    }

    @GetMapping("/entries/{id}")
    public ResponseDO get(@PathVariable long id) {
        return ok(ticketService.get(id));
    }

    @PostMapping("/entries/{id}/view")
    public ResponseDO view(@PathVariable long id) {
        ticketService.logView(id, securityContext.authenticateUser().getId());
        return ok(true);
    }

    @PostMapping("/entries/{id}/cancel")
    public ResponseDO cancel(@PathVariable long id, @RequestBody TicketCancelRequest request) {
        ticketService.cancel(id, request, securityContext.authenticateUser().getId());
        return ok(true);
    }

    @PostMapping("/entries/{id}")
    public ResponseDO update(@PathVariable long id, @RequestBody TicketSaveRequest request) {
        return ok(ticketService.update(id, request, securityContext.authenticateUser().getId()));
    }

    @PostMapping("/entries")
    public ResponseDO save(@RequestBody TicketSaveRequest request) {
        return ok(ticketService.save(request, securityContext.authenticateUser().getId()));
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
