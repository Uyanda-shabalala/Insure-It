package com.insureit.controllers;

import com.insureit.dto.ApiResponse;
import com.insureit.dto.DeviceRequest;
import com.insureit.models.Device;
import com.insureit.services.DeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService service;

    // TEMP: replace with the logged-in user's id once auth (Keke's ticket / #11) is merged
    private static final UUID TEMP_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private UUID currentUserId() {
        return TEMP_USER_ID;
    }

    // GET /devices
    // 200 OK: returns the user's devices (an empty list if they have none)
    @GetMapping
    public ResponseEntity<ApiResponse<List<Device>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(currentUserId())));
    }

    // GET /devices/{id}
    // 200 OK: device found
    // 404 Not Found: no device with this id for this user
    // 400 Bad Request: id isn't a valid UUID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Device>> getOne(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findOne(id, currentUserId())));
    }

    // POST /devices
    // 201 Created: device saved and returned
    // 400 Bad Request: validation failed (for example a blank name), or the body isn't valid JSON
    @PostMapping
    public ResponseEntity<ApiResponse<Device>> create(@Valid @RequestBody DeviceRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.create(body, currentUserId())));
    }

    // PUT /devices/{id}
    // 200 OK: device updated and returned
    // 404 Not Found: no device with this id for this user
    // 400 Bad Request: validation failed, invalid UUID, or invalid JSON
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Device>> update(@PathVariable UUID id, @Valid @RequestBody DeviceRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, body, currentUserId())));
    }

    // DELETE /devices/{id}
    // 200 OK: device removed
    // 404 Not Found: no device with this id for this user
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        service.delete(id, currentUserId());
        return ResponseEntity.ok(ApiResponse.ok("Device deleted"));
    }
}
