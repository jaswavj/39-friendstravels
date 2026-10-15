package com.billing.pos.dto;

import lombok.Data;

import java.util.List;

@Data
public class EditBillLoadData {
    private Long billId;
    private String billDisplay;
    private String customerName;
    private String customerPhone;
    private Long customerId;
    private Integer isTaxBill;
    private Double extraDisc;
    private Integer paymentMode;
    private Integer paymentType;
    private Double cashPaid;
    private Double bankPaid;
    private Double balance;
    private Double payable;
    private Double exchangePoint;
    private Integer isEligibleForCommission;
    private List<QuotationLineData> products;
}
