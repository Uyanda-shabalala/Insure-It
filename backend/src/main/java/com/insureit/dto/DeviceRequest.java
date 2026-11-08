package com.insureit.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DeviceRequest(
        String name,
        String brand,
        String model,
        String serialNumber,
        LocalDate purchaseDate,
        BigDecimal purchasePrice
) {}
