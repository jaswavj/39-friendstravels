package com.billing.admin.dto;

import lombok.Data;

@Data
public class EditLogRow {
    private Long id;
    private Long billId;
    private String billNo;
    private String action;
    private String details;
    private String date;
    private String time;
    private String userName;
}
