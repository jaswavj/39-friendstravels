package com.billing.expense.dto;

import lombok.Data;

@Data
public class ExpenseReportRow {
    private Long id;
    private String dateTime;
    private String typeName;
    private String content;
    private String description;
    private Double qty;
    private String busName;
    private String area;
    private Double amount;
    private String userName;
}
