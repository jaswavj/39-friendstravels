package com.billing.pos.dto;

import lombok.Data;

@Data
public class BillingOptionsData {
    private Integer discPer;
    private Boolean canBillWithoutStock;
    /** 1 = type (barcode/search), 2 = select (cafe/restaurant menu) */
    private Integer billingType;
}
