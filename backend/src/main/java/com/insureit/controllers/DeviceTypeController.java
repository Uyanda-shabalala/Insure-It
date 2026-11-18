package com.insureit.controllers;

import com.insureit.models.BrandResponse;
import com.insureit.models.DeviceTypeResponse;
import com.insureit.services.DeviceTypeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
@RequestMapping ("api/device-types")
public class DeviceTypeController {
        private DeviceTypeService deviceTypeService;
        public DeviceTypeController(DeviceTypeService deviceTypeService) {
            this.deviceTypeService = deviceTypeService;
        }

    @GetMapping
    public ResponseEntity<List<DeviceTypeResponse>> getAllDeviceTypes() {

        List<DeviceTypeResponse> devicetypes =deviceTypeService.getAllDeviceTypes();

        return ResponseEntity.ok(devicetypes);
    }
}
