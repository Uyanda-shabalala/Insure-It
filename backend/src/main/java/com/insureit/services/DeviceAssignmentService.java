package com.insureit.services;

import com.insureit.errors.DeviceApiException;
import com.insureit.models.*;
import com.insureit.repositories.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class DeviceAssignmentService {
    private final DeviceRepo devices;
    private final EmployeeRepo employees;
    private final DeviceAssignmentRepo assignments;
    public record AssignmentResponse(UUID id, EmployeeResponse employee, OffsetDateTime assignedAt) {}

    public DeviceAssignmentService(DeviceRepo devices, EmployeeRepo employees, DeviceAssignmentRepo assignments) {
        this.devices = devices;
        this.employees = employees;
        this.assignments = assignments;
    }

    public AssignmentResponse current(UUID deviceId) {
        if (!devices.existsById(deviceId)) throw error(HttpStatus.NOT_FOUND, "Device not found");
        return assignments.findFirstByDeviceIdAndReturnedAtIsNullOrderByAssignedAtDesc(deviceId)
                .map(this::response).orElse(null);
    }

    @Transactional
    public AssignmentResponse assign(UUID deviceId, UUID employeeId) {
        if (employeeId == null) throw error(HttpStatus.BAD_REQUEST, "Employee id is required");
        // Lock the device first for both assign and return to serialize concurrent requests.
        Device device = devices.lockById(deviceId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Device not found"));
        if (!"available".equalsIgnoreCase(device.getStatus()) ||
                assignments.findFirstByDeviceIdAndReturnedAtIsNullOrderByAssignedAtDesc(deviceId).isPresent())
            throw error(HttpStatus.CONFLICT, "Device is not available for assignment");
        Employee employee = employees.findById(employeeId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Employee not found"));
        DeviceAssignment assignment = new DeviceAssignment();
        assignment.setDevice(device);
        assignment.setEmployee(employee);
        assignment.setAssignedAt(OffsetDateTime.now());
        assignments.save(assignment);
        device.setStatus("assigned");
        devices.save(device);
        return response(assignment);
    }

    @Transactional
    public void returnDevice(UUID deviceId) {
        Device device = devices.lockById(deviceId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Device not found"));
        if (!"assigned".equalsIgnoreCase(device.getStatus()))
            throw error(HttpStatus.CONFLICT, "Only an assigned device can be returned");
        DeviceAssignment assignment = assignments.findFirstByDeviceIdAndReturnedAtIsNullOrderByAssignedAtDesc(deviceId)
                .orElseThrow(() -> error(HttpStatus.CONFLICT, "Device has no current assignment"));
        assignment.setReturnedAt(OffsetDateTime.now());
        assignments.save(assignment);
        device.setStatus("available");
        devices.save(device);
    }

    private AssignmentResponse response(DeviceAssignment assignment) {
        Employee e = assignment.getEmployee();
        return new AssignmentResponse(assignment.getId(), new EmployeeResponse(e.getId(), e.getEmployeeNumber(),
                e.getFullName(), e.getEmail(), e.getDepartment()), assignment.getAssignedAt());
    }
    private DeviceApiException error(HttpStatus status, String message) { return new DeviceApiException(status, message); }
}
