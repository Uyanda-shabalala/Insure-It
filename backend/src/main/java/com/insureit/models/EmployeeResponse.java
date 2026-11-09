package com.insureit.models;

import java.util.UUID;

public record EmployeeResponse(UUID id, String employeeNumber, String fullName, String email, String department) {}
