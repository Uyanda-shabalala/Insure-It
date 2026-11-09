package com.insureit.errors;

import com.insureit.controllers.DeviceController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {DeviceController.class, com.insureit.controllers.DeviceAssignmentController.class})
public class DeviceErrorHandler {
    public record ApiError(int status, String error, String message, Map<String, String> fields) {}

    @ExceptionHandler(DeviceApiException.class)
    public ResponseEntity<ApiError> deviceError(DeviceApiException exception) {
        return response(exception.status(), exception.getMessage(), exception.fields());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> unreadableBody() {
        return response(HttpStatus.BAD_REQUEST,
                "Request body must be valid JSON and reference ids must be valid UUIDs.", Map.of());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> invalidId() {
        return response(HttpStatus.BAD_REQUEST, "Device id must be a valid UUID.", Map.of("id", "Must be a valid UUID"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> unexpectedError() {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to complete the device request.", Map.of());
    }

    private ResponseEntity<ApiError> response(HttpStatus status, String message, Map<String, String> fields) {
        return ResponseEntity.status(status).body(new ApiError(status.value(), status.getReasonPhrase(), message, fields));
    }
}
