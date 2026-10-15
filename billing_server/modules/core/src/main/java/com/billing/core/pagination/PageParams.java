package com.billing.core.pagination;

public final class PageParams {
    public static final int DEFAULT_SIZE = 25;
    public static final int EXPORT_SIZE = 50_000;

    private PageParams() {
    }

    public static int page(int page) {
        return Math.max(0, page);
    }

    public static int size(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, EXPORT_SIZE);
    }
}
