package com.insureit.controllers;


import com.insureit.models.Brand;
import com.insureit.models.CreateDeviceRequest;
import com.insureit.models.Device;
import com.insureit.models.DeviceResponse;
import com.insureit.repositories.DeviceRepo;
import com.insureit.services.DeviceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {


    private  final DeviceService deviceService;
    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @PostMapping
    public ResponseEntity<DeviceResponse> registerDevice(@RequestBody CreateDeviceRequest request) {


        DeviceResponse response= deviceService.registerdevice(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();

    return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public ResponseEntity<List<DeviceResponse>> getAllDevices() {
        List<DeviceResponse> devices= deviceService.listAllDevices();

        return ResponseEntity.ok(devices);
    }


    @GetMapping("/{id}")
    public ResponseEntity<DeviceResponse> getDevice(@PathVariable("id") UUID id) {
        DeviceResponse device= deviceService.findById(id);
        if (device == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(device);
    }


}
