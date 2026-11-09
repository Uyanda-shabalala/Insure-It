package com.insureit.services;

import com.insureit.errors.DeviceApiException;
import org.springframework.http.HttpStatus;
import java.util.Locale;
import java.util.Map;

/** Field-specific validation shared by write services. Unicode names remain supported. */
public final class TextInput {
    private TextInput() {}
    public static String text(String value, String field, boolean required, int max) {
        String clean = value == null ? "" : value.strip();
        if (clean.isEmpty()) {
            if (required) throw invalid(field, "This field is required");
            return null;
        }
        if (clean.length() > max || !clean.matches("[\\p{L}\\p{M}\\p{N}\\p{P}\\p{Zs}]+") ||
                !clean.matches(".*[\\p{L}\\p{N}].*"))
            throw invalid(field, "Use letters or numbers with ordinary punctuation, up to " + max + " characters");
        return clean;
    }
    public static String serial(String value) {
        if (value == null || value.isBlank()) return null;
        String clean = value.strip().toUpperCase(Locale.ROOT);
        if (clean.length() > 120 || !clean.matches("[A-Z0-9][A-Z0-9._/ -]*") || !clean.matches(".*[A-Z0-9].*"))
            throw invalid("serialNumber", "Use letters, numbers, spaces, dots, slashes or hyphens (maximum 120 characters)");
        return clean;
    }
    private static DeviceApiException invalid(String field, String message) {
        return new DeviceApiException(HttpStatus.BAD_REQUEST, "Invalid input", Map.of(field, message));
    }
}
