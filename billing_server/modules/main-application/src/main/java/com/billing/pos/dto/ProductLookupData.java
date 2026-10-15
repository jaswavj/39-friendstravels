package com.billing.pos.dto;

import lombok.Data;

@Data
public class ProductLookupData {
    private Long id;
    private String code;
    private String name;
    private Long categoryId;
    private Double mrp;
    /** Computed Rs discount for one unit at MRP (legacy display). */
    private Double discount;
    /** Master disc_type: 0 none, 1 Rs, 2 %. */
    private Integer discType;
    /** Raw master discount value from prod_batch.discount. */
    private Double productDiscount;
    private Long batchId;
    private Long unitId;
    private String unitName;
    private Double commission;
    private String convertionUnit;
    private Double stock;
}
