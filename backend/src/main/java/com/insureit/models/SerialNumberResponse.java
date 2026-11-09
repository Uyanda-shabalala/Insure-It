package com.insureit.models;

public record SerialNumberResponse(String serialNumber, Status status, String source,
                                   boolean requiresReview) {
    public SerialNumberResponse(String serialNumber, Status status) {
        this(serialNumber, status, "groq", status == Status.FOUND);
    }
    public enum Status { FOUND, NOT_FOUND, REVIEW_REQUIRED, FAILED }
}
