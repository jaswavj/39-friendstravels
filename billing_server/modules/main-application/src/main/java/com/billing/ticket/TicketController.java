package com.billing.ticket;

import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import com.billing.ticket.dto.TicketSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
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
