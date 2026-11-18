package com.insureit.services;


import com.insureit.models.BrandResponse;
import com.insureit.models.DeviceResponse;
import com.insureit.models.DeviceTypeResponse;
import com.insureit.repositories.BrandRepo;
import com.insureit.repositories.DeviceTypeRepo;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DeviceTypeService {


    private final DeviceTypeRepo deviceTypeRepo;

    public DeviceTypeService(DeviceTypeRepo deviceTypeRepo) {
        this.deviceTypeRepo = deviceTypeRepo;
    }

    public List<DeviceTypeResponse> getAllDeviceTypes() {
    return deviceTypeRepo.findAll().stream()
        .map(deviceType -> new DeviceTypeResponse(deviceType.getId(), deviceType.getName()))
        .toList();
    }
}
