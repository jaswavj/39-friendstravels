package com.billing.pos.dto;

import com.billing.master.dto.NamedItemData;
import lombok.Data;

import java.util.List;

@Data
public class BillingMenuData {
    private List<NamedItemData> categories;
    private List<ProductLookupData> products;
}
