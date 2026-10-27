package com.insureit.controllers;


import com.insureit.models.Device;
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
    public ResponseEntity<Device> registerDevice(@RequestBody Device device) {

        Device savedDevice= deviceService.registerdevice(device);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(savedDevice.getId())
                .toUri();

        return ResponseEntity.created(location).body(savedDevice);
    }

    @GetMapping
    public ResponseEntity<List<Device>> getAllDevices() {
        List<Device> devices= deviceService.listAllDevices();
        return ResponseEntity.ok(devices);
    }


    @GetMapping("/{id}")
    public ResponseEntity<Device> getDevice(@PathVariable("id") UUID id) {
        Device device= deviceService.findById(id);
        if (device == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(device);
    }
}
