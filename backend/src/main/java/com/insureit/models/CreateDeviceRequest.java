package com.insureit.models;


import java.util.UUID;

public record CreateDeviceRequest(
        String name,
        String serialNumber,
        String model,
        UUID brandId,
        UUID deviceTypeId,
        String location
) {}