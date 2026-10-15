package com.billing.pos.dto;

import lombok.Data;

@Data
public class PrintDispatchData {
    private String type;
    private String billNo;
    private String message;
    private String printerName;
    private String payload;
    private Integer barcodePerRow;
    private Integer barcodeWidthMm;
    private Integer barcodeHeightMm;
}
