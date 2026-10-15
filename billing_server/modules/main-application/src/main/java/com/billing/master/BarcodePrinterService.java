package com.billing.master;

import com.billing.admin.AdminService;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.master.dto.BarcodePrintRequest;
import com.billing.pos.WinspoolRawPrinter;
import com.billing.pos.dto.PrintDispatchData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.print.DocFlavor;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.util.List;

/**
 * ESC/POS barcode labels to the company barcode printer.
 * Feeds only enough to clear the cutter, then cuts — no extra blank tail.
 */
@Service
@RequiredArgsConstructor
public class BarcodePrinterService {

    private static final byte[] INIT = {0x1B, 0x40};
    private static final byte[] ALIGN_CENTER = {0x1B, 0x61, 0x01};
    private static final byte[] BOLD_ON = {0x1B, 0x45, 0x01};
    private static final byte[] BOLD_OFF = {0x1B, 0x45, 0x00};
    private static final byte[] FONT_NORMAL = {0x1B, 0x21, 0x00};
    private static final DecimalFormat DF = new DecimalFormat("0.00");

    private final AdminService adminService;

    public PrintDispatchData print(BarcodePrintRequest request) {
        List<BarcodePrintRequest.BarcodePrintLine> items = request == null ? List.of() : request.getItems();
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("No barcodes to print");
        }
        int copies = 0;
        for (BarcodePrintRequest.BarcodePrintLine item : items) {
            copies += Math.max(0, item.getQty() == null ? 0 : item.getQty());
        }
        if (copies <= 0) {
            throw new RuntimeException("Quantity must be at least 1");
        }

        CompanyDetailsData company = adminService.company();
        String printerName = firstName(company.getBarcodePrinter(), company.getPrinterName());
        PrintService service = findPrintService(printerName);
        if (service == null || printerName.isBlank()) {
            return preview(company, "Barcode printer not found. Opening print preview.");
        }
        try {
            byte[] payload = buildLabels(items, company, copies);
            if (sendRaw(service.getName(), printerName, payload)) {
                PrintDispatchData data = new PrintDispatchData();
                data.setType("printed");
                data.setPrinterName(service.getName());
                data.setMessage("Printed " + copies + " label" + (copies == 1 ? "" : "s") + " to " + service.getName());
                applyLayout(data, company);
                return data;
            }
            return preview(company, "Could not send labels to " + service.getName() + ". Opening print preview.");
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new RuntimeException("Barcode print error: " + (ex.getMessage() == null ? "Unknown error" : ex.getMessage()));
        }
    }

    private PrintDispatchData preview(CompanyDetailsData company, String message) {
        PrintDispatchData data = new PrintDispatchData();
        data.setType("preview");
        data.setMessage(message);
        applyLayout(data, company);
        return data;
    }

    private byte[] buildLabels(List<BarcodePrintRequest.BarcodePrintLine> items, CompanyDetailsData company, int copies) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        write(out, INIT);
        write(out, FONT_NORMAL);
        write(out, ALIGN_CENTER);
        int printed = 0;
        for (BarcodePrintRequest.BarcodePrintLine item : items) {
            int qty = item.getQty() == null ? 0 : item.getQty();
            for (int i = 0; i < qty; i++) {
                printed++;
                writeLabel(out, company, item);
                if (printed < copies) {
                    write(out, new byte[]{0x1B, 0x64, 0x01});
                }
            }
        }
        write(out, new byte[]{0x1B, 0x4A, 0x28});
        write(out, new byte[]{0x1D, 0x56, 0x42, 0x00});
        write(out, new byte[]{0x1D, 0x56, 0x01});
        return out.toByteArray();
    }

    private void writeLabel(ByteArrayOutputStream out, CompanyDetailsData company, BarcodePrintRequest.BarcodePrintLine item) {
        String shop = nz(company.getShopName());
        String name = nz(item.getName());
        String code = nz(item.getCode());
        if (code.isBlank()) {
            throw new RuntimeException("Product code is required for barcode: " + (name.isBlank() ? "item" : name));
        }
        if (!shop.isBlank()) {
            write(out, BOLD_ON);
            write(out, clip(shop, 24) + "\n");
            write(out, BOLD_OFF);
        }
        if (!name.isBlank()) {
            write(out, clip(name, 28) + "\n");
        }
        write(out, "MRP Rs " + DF.format(item.getMrp() == null ? 0 : item.getMrp()) + "\n");
        writeBarcode(out, code);
        write(out, code + "\n");
    }

    private void writeBarcode(ByteArrayOutputStream out, String code) {
        write(out, new byte[]{0x1D, 0x68, 0x50});
        write(out, new byte[]{0x1D, 0x77, 0x02});
        write(out, new byte[]{0x1D, 0x48, 0x02});
        byte[] data = ("{B" + code).getBytes(StandardCharsets.US_ASCII);
        if (data.length > 80) {
            throw new RuntimeException("Barcode value is too long: " + code);
        }
        write(out, new byte[]{0x1D, 0x6B, 0x49, (byte) data.length});
        out.writeBytes(data);
        write(out, "\n");
    }

    private boolean sendRaw(String resolvedName, String configuredName, byte[] data) {
        if (WinspoolRawPrinter.print(resolvedName, data)) {
            return true;
        }
        if (configuredName != null && !configuredName.equalsIgnoreCase(resolvedName) && WinspoolRawPrinter.print(configuredName, data)) {
            return true;
        }
        String[] paths = {
                "\\\\localhost\\" + resolvedName,
                "\\\\.\\" + resolvedName
        };
        for (String path : paths) {
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(path)) {
                fos.write(data);
                fos.flush();
                return true;
            } catch (Exception ignored) {
                // try next path
            }
        }
        try {
            PrintService service = findPrintService(resolvedName);
            if (service == null) {
                return false;
            }
            service.createPrintJob().print(new SimpleDoc(data, DocFlavor.BYTE_ARRAY.AUTOSENSE, null), null);
            return true;
        } catch (Exception ex) {
            return false;
        }
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

    private void write(ByteArrayOutputStream out, byte[] data) {
        out.writeBytes(data);
    }

    private void write(ByteArrayOutputStream out, String text) {
        out.writeBytes(text.getBytes(StandardCharsets.UTF_8));
    }

    private void applyLayout(PrintDispatchData data, CompanyDetailsData company) {
        data.setBarcodePerRow(company.getBarcodePerRow() == null || company.getBarcodePerRow() < 1 ? 1 : company.getBarcodePerRow());
        data.setBarcodeWidthMm(company.getBarcodeWidthMm() == null ? 50 : company.getBarcodeWidthMm());
        data.setBarcodeHeightMm(company.getBarcodeHeightMm() == null ? 30 : company.getBarcodeHeightMm());
    }

    private String firstName(String barcodePrinter, String billPrinter) {
        if (barcodePrinter != null && !barcodePrinter.isBlank()) {
            return barcodePrinter.trim();
        }
        return billPrinter == null ? "" : billPrinter.trim();
    }

    private String nz(String value) {
        return value == null ? "" : value.trim();
    }

    private String clip(String value, int max) {
        if (value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }
}
