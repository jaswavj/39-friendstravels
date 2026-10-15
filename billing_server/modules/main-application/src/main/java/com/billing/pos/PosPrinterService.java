package com.billing.pos;

import com.billing.admin.AdminService;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.pos.dto.PrintBillData;
import com.billing.pos.dto.PrintDispatchData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ESC/POS thermal print.
 * print_type 2 = A4 browser preview; 1 = thermal.
 * thermal_print_type 1 = local deploy (print on this machine or error).
 * thermal_print_type 2 = cloud deploy (shop-PC print agent via start-print-agent.bat).
 */
@Service
@RequiredArgsConstructor
public class PosPrinterService {

    private static final byte[] INIT = {0x1B, 0x40};
    private static final byte[] BOLD_ON = {0x1B, 0x45, 0x01};
    private static final byte[] BOLD_OFF = {0x1B, 0x45, 0x00};
    private static final byte[] ALIGN_CENTER = {0x1B, 0x61, 0x01};
    private static final byte[] ALIGN_LEFT = {0x1B, 0x61, 0x00};
    private static final byte[] FONT_NORMAL = {0x1B, 0x21, 0x00};
    private static final byte[] FONT_A = {0x1B, 0x4D, 0x00};
    private static final byte[] FEED_4_LINES = {0x1B, 0x64, 0x04};
    private static final byte[] CUT_PARTIAL = {0x1D, 0x56, 0x01};
    private static final byte[] CUT_FEED = {0x1D, 0x56, 0x41, 0x03};
    private static final int WIDTH_58 = 32;
    private static final int WIDTH_80 = 48;
    private static final DecimalFormat DF = new DecimalFormat("0.00");

    private final BillingReadService readService;
    private final AdminService adminService;

    public PrintDispatchData dispatch(String billNo) {
        CompanyDetailsData company = adminService.company();
        int printType = company.getPrintType() == null ? 1 : company.getPrintType();
        if (printType == 2) {
            PrintDispatchData data = new PrintDispatchData();
            data.setType("a4");
            data.setBillNo(billNo);
            data.setMessage("Opening A4 print preview");
            return data;
        }
        return printReceipt(billNo);
    }

    public PrintDispatchData printReceipt(String billNo) {
        CompanyDetailsData company = adminService.company();
        PrintBillData bill = readService.printBill(billNo);
        String printerName = firstName(bill.getPrinterName(), company.getPrinterName());
        int width = receiptWidth(printerName);
        byte[] receipt;
        try {
            receipt = buildReceipt(bill, width);
        } catch (Exception ex) {
            throw new RuntimeException("Could not build receipt: " + (ex.getMessage() == null ? "Unknown error" : ex.getMessage()));
        }
        int thermalPrintType = company.getThermalPrintType() == null ? 1 : company.getThermalPrintType();
        if (thermalPrintType == 2) {
            if (printerName.isBlank()) {
                throw new RuntimeException("Printer name not found.");
            }
            PrintDispatchData data = new PrintDispatchData();
            data.setType("local");
            data.setBillNo(billNo);
            data.setPrinterName(printerName);
            data.setPayload(Base64.getEncoder().encodeToString(receipt));
            data.setMessage("Send to print agent on this PC. Keep start-print-agent.bat open.");
            return data;
        }
        if (printerName.isBlank()) {
            saveBillTxtOnError(company, bill, width);
            throw new RuntimeException("Printer name not found.");
        }
        PrintService service = findPrintService(printerName);
        String localName = service != null ? service.getName() : printerName;
        if (!printOnThisMachine(localName, printerName, receipt)) {
            saveBillTxtOnError(company, bill, width);
            throw new RuntimeException("Printer name not found.");
        }
        PrintDispatchData data = new PrintDispatchData();
        data.setType("printed");
        data.setBillNo(billNo);
        data.setPrinterName(localName);
        data.setMessage("Printed to: " + localName);
        return data;
    }

    private void saveBillTxtOnError(CompanyDetailsData company, PrintBillData bill, int width) {
        if (company.getThermalTxtFile() == null || company.getThermalTxtFile() != 1) {
            return;
        }
        try {
            Path dir = Path.of(System.getProperty("user.dir"), "bills");
            Files.createDirectories(dir);
            String name = nz(bill.getBillDisplay()).replaceAll("[^A-Za-z0-9._-]", "_");
            if (name.isBlank()) {
                name = "bill";
            }
            Files.writeString(dir.resolve(name + ".txt"), buildReceiptText(bill, width), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            // keep the printer error as the main failure
        }
    }

    private String buildReceiptText(PrintBillData bill, int width) {
        StringBuilder sb = new StringBuilder();
        appendCentered(sb, nz(bill.getCompanyName()), width);
        if (!blank(bill.getCompanyAddress())) {
            for (String line : bill.getCompanyAddress().split("\\r?\\n")) {
                appendCentered(sb, line, width);
            }
        }
        if (!blank(bill.getCompanyGstin())) {
            appendCentered(sb, "GSTIN: " + bill.getCompanyGstin(), width);
        }
        sb.append(divider(width));
        String date = nz(bill.getDate());
        sb.append(padRight("Bill: " + nz(bill.getBillDisplay()), width - date.length())).append(date).append('\n');
        sb.append("Cust: ").append(nz(bill.getCustomerName())).append('\n');
        if (hasValue(bill.getCustomerPhone())) {
            sb.append("Ph: ").append(bill.getCustomerPhone()).append('\n');
        }
        if (hasValue(bill.getCustomerGstin())) {
            sb.append("GSTIN: ").append(bill.getCustomerGstin()).append('\n');
        }
        sb.append(divider(width));
        sb.append(itemHeader(width));
        sb.append(divider(width));
        Totals totals = appendItems(sb, bill, width);
        sb.append(divider(width));
        sb.append(formatTotal("Items:", String.valueOf((int) totals.qty), width));
        if (totals.discount > 0) {
            sb.append(formatTotal("Item Disc:", "-Rs " + DF.format(totals.discount), width));
        }
        if (totals.extra > 0) {
            sb.append(formatTotal("Extra Disc:", "-Rs " + DF.format(totals.extra), width));
        }
        if (totals.exchPoint > 0) {
            sb.append(formatTotal("Exchange Point:", "-Rs " + DF.format(totals.exchPoint), width));
        }
        sb.append(divider(width));
        sb.append(formatTotal("TOTAL:", "Rs " + DF.format(totals.finalPaid), width));
        sb.append(divider(width));
        sb.append(formatTotal("Paid:", "Rs " + DF.format(n(bill.getPaid())), width));
        if (n(bill.getBalance()) != 0) {
            String label = bill.getBalance() > 0 ? "Balance:" : "Change:";
            sb.append(formatTotal(label, "Rs " + DF.format(Math.abs(bill.getBalance())), width));
        }
        if (totals.gst > 0) {
            sb.append(divider(width));
            sb.append("GST Summary:\n");
            List<Integer> rates = new ArrayList<>(totals.taxable.keySet());
            Collections.sort(rates);
            for (Integer rate : rates) {
                if (rate > 0) {
                    sb.append("GST").append(rate).append("% Txbl:Rs").append(DF.format(totals.taxable.get(rate))).append('\n');
                    sb.append("CGST:Rs").append(DF.format(totals.cgst.get(rate)))
                            .append(" SGST:Rs").append(DF.format(totals.sgst.get(rate))).append('\n');
                }
            }
            sb.append(formatTotal("Total GST:", "Rs " + DF.format(totals.gst), width));
        }
        sb.append(divider(width));
        appendCentered(sb, nz(bill.getAmountInWords()).toUpperCase(), width);
        appendCentered(sb, "Thank You! Visit Again", width);
        return sb.toString();
    }

    private int receiptWidth(String printerName) {
        return printerName != null && printerName.contains("58") ? WIDTH_58 : WIDTH_80;
    }

    private String firstName(String... names) {
        if (names == null) {
            return "";
        }
        for (String name : names) {
            if (name != null && !name.isBlank()) {
                return name.trim();
            }
        }
        return "";
    }

    private boolean printOnThisMachine(String resolvedName, String configuredName, byte[] receipt) {
        if (!WinspoolRawPrinter.isWindows()) {
            return false;
        }
        if (WinspoolRawPrinter.print(resolvedName, receipt)) {
            return true;
        }
        return configuredName != null
                && !configuredName.equalsIgnoreCase(resolvedName)
                && WinspoolRawPrinter.print(configuredName, receipt);
    }

    private PrintService findPrintService(String printerName) {
        if (printerName == null || printerName.isBlank()) {
            return null;
        }
        PrintService[] services = PrintServiceLookup.lookupPrintServices(null, null);
        for (PrintService service : services) {
            if (service.getName().toLowerCase().contains(printerName.toLowerCase())) {
                return service;
            }
        }
        return null;
    }

    private byte[] buildReceipt(PrintBillData bill, int width) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        write(out, INIT);
        write(out, FONT_NORMAL);
        write(out, FONT_A);
        write(out, ALIGN_CENTER);
        write(out, BOLD_ON);
        write(out, nz(bill.getCompanyName()) + "\n");
        write(out, BOLD_OFF);
        writeAddress(out, bill.getCompanyAddress());
        if (!blank(bill.getCompanyGstin())) {
            write(out, "GSTIN: " + bill.getCompanyGstin() + "\n");
        }
        write(out, divider(width));
        write(out, ALIGN_LEFT);
        String date = nz(bill.getDate());
        write(out, padRight("Bill: " + nz(bill.getBillDisplay()), width - date.length()) + date + "\n");
        write(out, "Cust: " + nz(bill.getCustomerName()) + "\n");
        if (hasValue(bill.getCustomerPhone())) {
            write(out, "Ph: " + bill.getCustomerPhone() + "\n");
        }
        if (hasValue(bill.getCustomerGstin())) {
            write(out, "GSTIN: " + bill.getCustomerGstin() + "\n");
        }
        write(out, divider(width));
        write(out, BOLD_ON);
        write(out, itemHeader(width));
        write(out, BOLD_OFF);
        write(out, divider(width));
        Totals totals = writeItems(out, bill, width);
        write(out, divider(width));
        write(out, formatTotal("Items:", String.valueOf((int) totals.qty), width));
        if (totals.discount > 0) {
            write(out, formatTotal("Item Disc:", "-Rs " + DF.format(totals.discount), width));
        }
        if (totals.extra > 0) {
            write(out, formatTotal("Extra Disc:", "-Rs " + DF.format(totals.extra), width));
        }
        if (totals.exchPoint > 0) {
            write(out, formatTotal("Exchange Point:", "-Rs " + DF.format(totals.exchPoint), width));
        }
        write(out, divider(width));
        write(out, BOLD_ON);
        write(out, formatTotal("TOTAL:", "Rs " + DF.format(totals.finalPaid), width));
        write(out, BOLD_OFF);
        write(out, divider(width));
        write(out, formatTotal("Paid:", "Rs " + DF.format(n(bill.getPaid())), width));
        if (n(bill.getBalance()) != 0) {
            write(out, BOLD_ON);
            String label = bill.getBalance() > 0 ? "Balance:" : "Change:";
            write(out, formatTotal(label, "Rs " + DF.format(Math.abs(bill.getBalance())), width));
            write(out, BOLD_OFF);
        }
        if (totals.gst > 0) {
            write(out, divider(width));
            write(out, BOLD_ON);
            write(out, "GST Summary:\n");
            write(out, BOLD_OFF);
            writeGst(out, totals, width);
        }
        write(out, divider(width));
        write(out, ALIGN_CENTER);
        write(out, nz(bill.getAmountInWords()).toUpperCase() + "\n");
        write(out, "Thank You! Visit Again\n");
        write(out, FEED_4_LINES);
        write(out, CUT_FEED);
        write(out, CUT_PARTIAL);
        return out.toByteArray();
    }

    private Totals writeItems(ByteArrayOutputStream out, PrintBillData bill, int width) {
        StringBuilder sb = new StringBuilder();
        Totals totals = appendItems(sb, bill, width);
        write(out, sb.toString());
        return totals;
    }

    private Totals appendItems(StringBuilder sb, PrintBillData bill, int width) {
        Totals totals = new Totals();
        totals.extra = n(bill.getExtraDiscount());
        totals.exchPoint = n(bill.getExchangePointUsed());
        if (bill.getItems() == null) {
            totals.finalPaid = Math.max(0, totals.amount - totals.extra - totals.exchPoint);
            return totals;
        }
        for (PrintBillData.PrintLineData item : bill.getItems()) {
            double qty = n(item.getQty());
            double price = n(item.getPrice());
            double disc = n(item.getDiscount());
            double total = n(item.getTotal());
            int gstPer = item.getGst() == null ? 0 : item.getGst();
            double taxable = total / (1 + (gstPer / 100.0));
            double gstAmt = total - taxable;
            totals.qty += qty;
            totals.amount += total;
            totals.discount += disc;
            totals.gst += gstAmt;
            totals.taxable.merge(gstPer, taxable, Double::sum);
            totals.cgst.merge(gstPer, gstAmt / 2, Double::sum);
            totals.sgst.merge(gstPer, gstAmt / 2, Double::sum);
            sb.append(itemRow(nz(item.getName()), qtyStr(item.getQty()), DF.format(price), DF.format(total), gstPer, width));
            if (disc > 0) {
                sb.append(padLeft("Disc: -" + DF.format(disc), width)).append('\n');
            }
        }
        totals.finalPaid = Math.max(0, totals.amount - totals.extra - totals.exchPoint);
        return totals;
    }

    private void writeGst(ByteArrayOutputStream out, Totals totals, int width) {
        List<Integer> rates = new ArrayList<>(totals.taxable.keySet());
        Collections.sort(rates);
        for (Integer rate : rates) {
            if (rate > 0) {
                write(out, "GST" + rate + "% Txbl:Rs" + DF.format(totals.taxable.get(rate)) + "\n");
                write(out, "CGST:Rs" + DF.format(totals.cgst.get(rate)) + " SGST:Rs" + DF.format(totals.sgst.get(rate)) + "\n");
            }
        }
        write(out, BOLD_ON);
        write(out, formatTotal("Total GST:", "Rs " + DF.format(totals.gst), width));
        write(out, BOLD_OFF);
    }

    private void writeAddress(ByteArrayOutputStream out, String address) {
        if (blank(address)) {
            return;
        }
        for (String line : address.split("\\r?\\n")) {
            if (!blank(line)) {
                write(out, line.trim() + "\n");
            }
        }
    }

    private String itemHeader(int width) {
        if (width == WIDTH_58) {
            return padRight("ITEM", 18) + padRight("Q", 4) + padLeft("RATE", 5) + padLeft("AMT", 5) + "\n";
        }
        return padRight("ITEM", 28) + padRight("QTY", 6) + padLeft("RATE", 7) + padLeft("AMT", 7) + "\n";
    }

    private String itemRow(String name, String qty, String rate, String amt, int gstPer, int width) {
        int nameWidth = width == WIDTH_58 ? 18 : 28;
        int qtyW = width == WIDTH_58 ? 4 : 6;
        int numW = width == WIDTH_58 ? 5 : 7;
        if (gstPer > 0 && name.length() < nameWidth - 5) {
            name = name + "(" + gstPer + "%)";
        }
        if (name.length() > nameWidth) {
            name = name.substring(0, nameWidth);
        }
        return padRight(name, nameWidth) + padRight(qty, qtyW) + padLeft(rate, numW) + padLeft(amt, numW) + "\n";
    }

    private String formatTotal(String label, String value, int width) {
        int padding = Math.max(1, width - label.length() - value.length());
        return label + " ".repeat(padding) + value + "\n";
    }

    private String divider(int width) {
        return "-".repeat(width) + "\n";
    }

    private String padRight(String s, int width) {
        if (s == null) s = "";
        if (s.length() >= width) return s.substring(0, width);
        return s + " ".repeat(width - s.length());
    }

    private String padLeft(String s, int width) {
        if (s == null) s = "";
        if (s.length() >= width) return s;
        return " ".repeat(width - s.length()) + s;
    }

    private void appendCentered(StringBuilder sb, String text, int width) {
        if (blank(text)) {
            return;
        }
        String remaining = text.trim();
        while (remaining.length() > width) {
            sb.append(centerLine(remaining.substring(0, width), width));
            remaining = remaining.substring(width).trim();
        }
        if (!remaining.isEmpty()) {
            sb.append(centerLine(remaining, width));
        }
    }

    private String centerLine(String text, int width) {
        if (text.length() >= width) {
            return text + "\n";
        }
        int pad = (width - text.length()) / 2;
        return " ".repeat(pad) + text + "\n";
    }

    private void write(ByteArrayOutputStream out, byte[] data) {
        out.writeBytes(data);
    }

    private void write(ByteArrayOutputStream out, String text) {
        out.writeBytes(text.getBytes(StandardCharsets.ISO_8859_1));
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private boolean hasValue(String value) {
        return !blank(value) && !"-".equals(value);
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private double n(Double value) {
        return value == null ? 0 : value;
    }

    private String qtyStr(Double qty) {
        if (qty == null) return "0";
        if (qty == Math.rint(qty)) return String.valueOf(qty.intValue());
        return String.valueOf(qty);
    }

    private static class Totals {
        double qty;
        double amount;
        double discount;
        double extra;
        double exchPoint;
        double gst;
        double finalPaid;
        Map<Integer, Double> taxable = new HashMap<>();
        Map<Integer, Double> cgst = new HashMap<>();
        Map<Integer, Double> sgst = new HashMap<>();
    }
}
