package com.insureit.dto;

/**
 * Standard wrapper for every API response.
 * success: true for 2xx, false for errors
 * status:  the HTTP status code
 * message: short description (the error message on failures)
 * data:    the payload (null on errors and deletes)
 */
public record ApiResponse<T>(boolean success, int status, String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, 200, "OK", data);
    }

    public static <T> ApiResponse<T> ok(String message) {
        return new ApiResponse<>(true, 200, message, null);
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(true, 201, "Created", data);
    }

    public static <T> ApiResponse<T> error(int status, String message) {
        return new ApiResponse<>(false, status, message, null);
    }
}
