package com.billing.common;

import com.billing.core.pagination.PageParams;
import com.billing.core.pagination.PageResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class JdbcPageHelper {

    private JdbcPageHelper() {
    }

    public static <T> PageResult<T> query(
            JdbcTemplate jdbc,
            String selectSql,
            RowMapper<T> mapper,
            int page,
            int size,
            Object... args
    ) {
        int p = PageParams.page(page);
        int s = PageParams.size(size);
        String countSql = "SELECT COUNT(*) FROM (" + selectSql + ") _page_cnt";
        Long total = jdbc.queryForObject(countSql, Long.class, args);
        long totalVal = total == null ? 0L : total;
        String pagedSql = selectSql + " LIMIT ? OFFSET ?";
        List<Object> argList = new ArrayList<>(Arrays.asList(args));
        argList.add(s);
        argList.add((long) p * s);
        List<T> items = jdbc.query(pagedSql, mapper, argList.toArray());
        return PageResult.of(items, totalVal, p, s);
    }

    public static <T> PageResult<T> slice(List<T> all, int page, int size) {
        if (all == null || all.isEmpty()) {
            return PageResult.of(List.of(), 0, PageParams.page(page), PageParams.size(size));
        }
        int p = PageParams.page(page);
        int s = PageParams.size(size);
        int from = p * s;
        if (from >= all.size()) {
            return PageResult.of(List.of(), all.size(), p, s);
        }
        int to = Math.min(from + s, all.size());
        return PageResult.of(all.subList(from, to), all.size(), p, s);
    }
}
