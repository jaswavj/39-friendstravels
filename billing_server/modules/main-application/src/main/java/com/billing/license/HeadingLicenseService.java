package com.billing.license;

import com.billing.core.license.LicenseValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HeadingLicenseService implements LicenseValidator {

    public static final String EXPIRED_MESSAGE =
            "Your license is expired please Contact JasXbill no-8667214152";

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void validateForLogin() {
        Long id = headingId();
        if (id == null) {
            return;
        }
        LocalDate start = ensureStartingDate(id);
        int activeDays = activeDays(id);
        if (activeDays < 0) {
            throw new RuntimeException(EXPIRED_MESSAGE);
        }
        LocalDate today = LocalDate.now();
        LocalDate lastValidDay = start.plusDays(activeDays);
        if (today.isAfter(lastValidDay)) {
            throw new RuntimeException(EXPIRED_MESSAGE);
        }
    }

    private Long headingId() {
        List<Long> ids = jdbcTemplate.query(
                "SELECT id FROM heading ORDER BY id LIMIT 1",
                (rs, rowNum) -> rs.getLong("id")
        );
        return ids.isEmpty() ? null : ids.get(0);
    }

    private LocalDate ensureStartingDate(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT starting_date FROM heading WHERE id = ?",
                id
        );
        if (rows.isEmpty()) {
            throw new RuntimeException(EXPIRED_MESSAGE);
        }
        Object raw = rows.get(0).get("starting_date");
        if (raw == null) {
            jdbcTemplate.update("UPDATE heading SET starting_date = CURDATE() WHERE id = ?", id);
            raw = jdbcTemplate.queryForObject(
                    "SELECT starting_date FROM heading WHERE id = ?",
                    LocalDate.class,
                    id
            );
        }
        if (raw instanceof LocalDate date) {
            return date;
        }
        if (raw instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        return LocalDate.parse(raw.toString());
    }

    private int activeDays(long id) {
        Integer active = jdbcTemplate.queryForObject(
                "SELECT active FROM heading WHERE id = ?",
                Integer.class,
                id
        );
        return active == null ? 0 : active;
    }
}
