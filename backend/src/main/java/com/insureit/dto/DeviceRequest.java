package com.insureit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DeviceRequest(
        @NotBlank(message = "Device name is required")
        String name,
        String brand,
        String model,
        String serialNumber,
        LocalDate purchaseDate,
        @PositiveOrZero(message = "Purchase price cannot be negative")
        BigDecimal purchasePrice
) {}
