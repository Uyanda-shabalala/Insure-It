package com.insureit.controllers;

import com.insureit.errors.DeviceApiException;
import com.insureit.models.DeviceResponse;
import com.insureit.repositories.DeviceRepo;
import com.insureit.repositories.DeviceAssignmentRepo;
import com.insureit.services.DeviceService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
public class DeviceStateController {
    private final DeviceRepo devices;
    private final DeviceAssignmentRepo assignments;
    private final DeviceService service;
    public record StateRequest(String action) {}
    public DeviceStateController(DeviceRepo devices, DeviceAssignmentRepo assignments, DeviceService service) {
        this.devices = devices; this.assignments = assignments; this.service = service;
    }
    @PatchMapping("/{id}/state")
    @Transactional
    public DeviceResponse change(@PathVariable UUID id, @RequestBody StateRequest request) {
        var device = devices.lockById(id).orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "Device not found"));
        String current = device.getStatus().toLowerCase(java.util.Locale.ROOT);
        boolean held = assignments.findFirstByDeviceIdAndReturnedAtIsNullOrderByAssignedAtDesc(id).isPresent();
        String action = request == null || request.action() == null ? "" : request.action();
        String next = switch (action) {
            case "send_for_repair" -> current.equals("available") || current.equals("assigned") ? "repair" : null;
            case "complete_repair" -> current.equals("repair") ? (held ? "assigned" : "available") : null;
            case "mark_lost" -> java.util.Set.of("available", "assigned", "repair").contains(current) ? "lost" : null;
            case "recover" -> current.equals("lost") ? (held ? "assigned" : "available") : null;
            case "retire" -> current.equals("available") && !held ? "retired" : null;
            default -> throw new DeviceApiException(HttpStatus.BAD_REQUEST, "Unknown device action");
        };
        if (next == null) throw new DeviceApiException(HttpStatus.CONFLICT, "This action is not allowed in the device's current state. Return the device before retiring it.");
        device.setStatus(next);
        devices.saveAndFlush(device);
        return service.findById(id);
    }
}
