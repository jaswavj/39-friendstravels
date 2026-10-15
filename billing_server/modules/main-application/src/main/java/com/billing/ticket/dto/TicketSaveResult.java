package com.billing.ticket.dto;

import lombok.Data;

@Data
public class TicketSaveResult {
    private Long id;
    private Long customerId;
    private Double credit;
    private Double balance;
}
