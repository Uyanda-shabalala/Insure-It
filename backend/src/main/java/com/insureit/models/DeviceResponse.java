package com.insureit.models;

import java.util.UUID;

public record DeviceResponse(
        UUID id,
        String name,
        String serialNumber,
        String model,
        String brand,
        String deviceType,
        String location,
        String status,
        java.time.OffsetDateTime createdAt,
        java.time.OffsetDateTime updatedAt,
        java.time.LocalDate purchaseDate,
        java.math.BigDecimal insuredValue,
        PolicyResponse insurancePolicy
) {
    public record PolicyResponse(UUID id, String policyNumber, String insurerName,
                                 java.time.LocalDate startDate, java.time.LocalDate endDate) {}
}
