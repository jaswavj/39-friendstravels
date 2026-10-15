package com.billing.pos.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuotationEditData {
    private String customerName;
    private String customerPhone;
    private Long customerId;
    private Double extraDiscount;
    private Integer isTaxBill;
    private Integer isCommission;
    private List<QuotationLineData> lines;
}
