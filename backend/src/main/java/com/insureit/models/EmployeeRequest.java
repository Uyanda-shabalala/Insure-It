package com.insureit.models;

/** Full employee details used for creation and replacement. */
public record EmployeeRequest(String employeeNumber, String fullName, String email, String department) {}
