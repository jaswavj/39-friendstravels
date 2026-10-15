package com.billing.pos.dto;

import lombok.Data;

@Data
public class QuotationData {
    private Long id;
    private String billDisplay;
    private String customerName;
    private String customerPhone;
    private Double payable;
    private Double extraDiscount;
    private Long customerId;
    private Integer isTaxBill;
    private Integer isCommission;
    private String date;
    private String time;
}
