package com.billing.master.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class BarcodePrintRequest {
    private List<BarcodePrintLine> items = new ArrayList<>();

    @Data
    public static class BarcodePrintLine {
        private String name;
        private String code;
        private Double mrp;
        private Integer qty;
    }
}
