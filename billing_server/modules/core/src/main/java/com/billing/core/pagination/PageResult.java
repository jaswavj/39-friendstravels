package com.billing.core.pagination;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {
    private List<T> items = Collections.emptyList();
    private long total;
    private int page;
    private int size;

    public static <T> PageResult<T> of(List<T> items, long total, int page, int size) {
        return new PageResult<>(items == null ? Collections.emptyList() : items, total, page, size);
    }
}
