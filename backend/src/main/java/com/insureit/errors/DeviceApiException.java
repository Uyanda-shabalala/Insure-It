package com.insureit.errors;

import org.springframework.http.HttpStatus;
import java.util.Map;

public class DeviceApiException extends RuntimeException {
    private final HttpStatus status;
    private final Map<String, String> fields;

    public DeviceApiException(HttpStatus status, String message) {
        this(status, message, Map.of());
    }

    public DeviceApiException(HttpStatus status, String message, Map<String, String> fields) {
        super(message);
        this.status = status;
        this.fields = Map.copyOf(fields);
    }

    public HttpStatus status() { return status; }
    public Map<String, String> fields() { return fields; }
}
