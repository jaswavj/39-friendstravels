package com.billing.admin.dto;

import lombok.Data;

@Data
public class CompanyDetailsData {
    private Long id;
    private String shopName;
    private String address;
    private String gstin;
    private Integer printType;
    private Integer thermalPrintType;
    private Integer thermalTxtFile;
    private Integer billingType;
    private String printerName;
    private String bankDetails;
    private String barcodePrinter;
    private Integer barcodePerRow;
    private Integer barcodeWidthMm;
    private Integer barcodeHeightMm;
}
