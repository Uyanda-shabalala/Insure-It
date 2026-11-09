package com.insureit.models;

import java.util.UUID;

public record DeviceTypeResponse(
        UUID id,
        String name
) {}
