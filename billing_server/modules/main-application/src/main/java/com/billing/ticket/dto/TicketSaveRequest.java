package com.billing.ticket.dto;

import lombok.Data;

@Data
public class TicketSaveRequest {
    private Long customerId;
    private String customerName;
    private String phone;
    private Long fromPlaceId;
    private String fromName;
    private Long toPlaceId;
    private String toName;
    private String transport;
    private String kind;
    private Long incomeTypeId;
    private String incomeTypeName;
    private String notes;
    private Double qty;
    private String busName;
    private String area;
    private String seatNo;
    private Double amount;
    private Double cashPaid;
    private Double gpayPaid;
    private Double cardPaid;
    private Double partyPaid;
    private Double credit;
    private String actualDate;
    private String actualTime;
    private String entryDate;
    private String entryTime;
}
