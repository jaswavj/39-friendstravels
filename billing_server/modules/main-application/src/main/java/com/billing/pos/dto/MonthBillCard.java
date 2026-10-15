package com.billing.pos.dto;

import lombok.Data;

@Data
public class MonthBillCard {
    private Long billId;
    private String billDisplay;
    private String customerName;
    private String customerPhone;
    private String date;
    private String time;
    private Double payable;
    private Integer paymentMode;
    private Integer isTaxBill;
    private String stateLabel;
    private Boolean exchanged;
    private Boolean returned;
    private Double exchPoint;
}
