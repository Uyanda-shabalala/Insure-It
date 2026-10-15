package com.insureit.models;

public record SerialNumberResponse(String serialNumber, Status status) {
    public enum Status { FOUND, NOT_FOUND }
}
