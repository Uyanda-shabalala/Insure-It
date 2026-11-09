package com.insureit.controllers;

import com.insureit.services.DeviceAssignmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices/{id}")
public class DeviceAssignmentController {
    private final DeviceAssignmentService service;
    public record AssignRequest(UUID employeeId) {}
    public DeviceAssignmentController(DeviceAssignmentService service) { this.service = service; }

    @GetMapping("/assignment")
    public ResponseEntity<DeviceAssignmentService.AssignmentResponse> current(@PathVariable("id") UUID id) {
        var assignment = service.current(id);
        return assignment == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(assignment);
    }
    @PostMapping("/assign")
    public DeviceAssignmentService.AssignmentResponse assign(@PathVariable("id") UUID id, @RequestBody AssignRequest request) {
        return service.assign(id, request == null ? null : request.employeeId());
    }
    @PostMapping("/return")
    public ResponseEntity<Void> returnDevice(@PathVariable("id") UUID id) {
        service.returnDevice(id);
        return ResponseEntity.noContent().build();
    }
}
