package com.billing.master;

import com.billing.core.response.ResponseDO;
import com.billing.master.dto.BarcodePrintRequest;
import com.billing.master.dto.BulkUpdateItem;
import com.billing.master.dto.ComponentSaveRequest;
import com.billing.master.dto.CustomerSaveRequest;
import com.billing.master.dto.NameSaveRequest;
import com.billing.master.dto.ProductSaveRequest;
import com.billing.master.dto.StockAdjustRequest;
import com.billing.master.dto.UnitSaveRequest;
import com.billing.security.PlatformSecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/master")
public class MasterController {

    private final MasterService masterService;
    private final BarcodePrinterService barcodePrinterService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/lookups")
    public ResponseDO lookups() {
        return ok(masterService.lookups());
    }

    @GetMapping("/categories")
    public ResponseDO categories(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "25") int size,
                                 @RequestParam(required = false) String q) {
        return ok(masterService.categories(page, size, q));
    }

    @GetMapping("/categories/all")
    public ResponseDO categoriesAll() {
        return ok(masterService.categoriesAll());
    }

    @PostMapping("/categories")
    public ResponseDO saveCategory(@RequestBody NameSaveRequest request) {
        masterService.saveCategory(request);
        return ok(true);
    }

    @PostMapping("/categories/{id}/block")
    public ResponseDO blockCategory(@PathVariable Long id) {
        masterService.blockCategory(id);
        return ok(true);
    }

    @GetMapping("/brands")
    public ResponseDO brands(@RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "25") int size,
                             @RequestParam(required = false) String q) {
        return ok(masterService.brands(page, size, q));
    }

    @GetMapping("/brands/all")
    public ResponseDO brandsAll() {
        return ok(masterService.brandsAll());
    }

    @PostMapping("/brands")
    public ResponseDO saveBrand(@RequestBody NameSaveRequest request) {
        masterService.saveBrand(request);
        return ok(true);
    }

    @PostMapping("/brands/{id}/block")
    public ResponseDO blockBrand(@PathVariable Long id) {
        masterService.blockBrand(id);
        return ok(true);
    }

    @GetMapping("/units")
    public ResponseDO units(@RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "25") int size,
                            @RequestParam(required = false) String q) {
        return ok(masterService.units(page, size, q));
    }

    @PostMapping("/units")
    public ResponseDO saveUnit(@RequestBody UnitSaveRequest request) {
        masterService.saveUnit(request);
        return ok(true);
    }

    @PostMapping("/units/{id}/status")
    public ResponseDO unitStatus(@PathVariable Long id, @RequestParam int active) {
        masterService.updateUnitStatus(id, active);
        return ok(true);
    }

    @GetMapping("/customers")
    public ResponseDO customers(@RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "25") int size,
                                @RequestParam(required = false) String q) {
        return ok(masterService.customers(page, size, q));
    }

    @GetMapping("/customers/all")
    public ResponseDO customersAll() {
        return ok(masterService.customersAll());
    }

    @PostMapping("/customers")
    public ResponseDO saveCustomer(@RequestBody CustomerSaveRequest request) {
        masterService.saveCustomer(request);
        return ok(true);
    }

    @PostMapping("/customers/{id}/block")
    public ResponseDO blockCustomer(@PathVariable Long id) {
        masterService.blockCustomer(id);
        return ok(true);
    }

    @GetMapping("/products")
    public ResponseDO products(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "25") int size,
                               @RequestParam(required = false) String q) {
        return ok(masterService.products(page, size, q));
    }

    @GetMapping("/product-options")
    public ResponseDO productOptions() {
        return ok(masterService.productOptions());
    }

    @PostMapping("/products")
    public ResponseDO saveProduct(@RequestBody ProductSaveRequest request) {
        masterService.saveProduct(request, currentUserId());
        return ok(true);
    }

    @PostMapping("/products/{id}/block")
    public ResponseDO blockProduct(@PathVariable Long id) {
        masterService.blockProduct(id);
        return ok(true);
    }

    @GetMapping("/stock/products")
    public ResponseDO stockProducts(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "25") int size,
                                    @RequestParam(required = false) String q) {
        return ok(masterService.stockProducts(page, size, q));
    }

    @PostMapping("/stock/adjust")
    public ResponseDO adjustStock(@RequestBody StockAdjustRequest request) {
        masterService.adjustStock(request, currentUserId());
        return ok(true);
    }

    @GetMapping("/components")
    public ResponseDO components(@RequestParam Long productId) {
        return ok(masterService.components(productId));
    }

    @PostMapping("/components")
    public ResponseDO saveComponent(@RequestBody ComponentSaveRequest request) {
        masterService.saveComponent(request, currentUserId());
        return ok(true);
    }

    @DeleteMapping("/components/{id}")
    public ResponseDO deleteComponent(@PathVariable Long id) {
        masterService.deleteComponent(id);
        return ok(true);
    }

    @GetMapping("/tables")
    public ResponseDO cafeTables(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "25") int size,
                                 @RequestParam(required = false) String q) {
        return ok(masterService.cafeTables(page, size, q));
    }

    @PostMapping("/tables")
    public ResponseDO saveCafeTable(@RequestBody NameSaveRequest request) {
        masterService.saveCafeTable(request);
        return ok(true);
    }

    @DeleteMapping("/tables/{id}")
    public ResponseDO deleteCafeTable(@PathVariable Long id) {
        masterService.deleteCafeTable(id);
        return ok(true);
    }

    @GetMapping("/bulk-products")
    public ResponseDO bulkProducts(@RequestParam(required = false) String name,
                                   @RequestParam(required = false) Long categoryId,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "25") int size) {
        return ok(masterService.bulkProducts(name, categoryId, page, size));
    }

    @PostMapping("/bulk-products")
    public ResponseDO bulkUpdate(@RequestBody List<BulkUpdateItem> items) {
        return ok(masterService.bulkUpdate(items));
    }

    @GetMapping("/barcodes")
    public ResponseDO barcodes(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "25") int size,
                               @RequestParam(required = false) String q) {
        return ok(masterService.barcodes(page, size, q));
    }

    @PostMapping("/barcodes/print")
    public ResponseDO printBarcodes(@RequestBody BarcodePrintRequest request) {
        return ok(barcodePrinterService.print(request));
    }

    private Long currentUserId() {
        return securityContext.authenticateUser().getId();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
