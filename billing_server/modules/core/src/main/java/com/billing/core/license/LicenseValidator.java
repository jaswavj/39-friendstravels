package com.billing.core.license;

/**
 * Validates application license (heading.starting_date + heading.active) before login.
 */
public interface LicenseValidator {

    void validateForLogin();
}
