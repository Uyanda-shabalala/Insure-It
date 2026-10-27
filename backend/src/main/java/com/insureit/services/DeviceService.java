package com.insureit.services;

import com.insureit.models.Brand;
import com.insureit.models.Device;
import com.insureit.models.DeviceType;
import com.insureit.repositories.BrandRepo;
import com.insureit.repositories.DeviceRepo;
import com.insureit.repositories.DeviceTypeRepo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class DeviceService {
    private final DeviceRepo deviceRepo;
    private final DeviceTypeRepo deviceTypeRepo;
    private final BrandRepo brandRepo;

    public DeviceService(DeviceRepo deviceRepo, DeviceTypeRepo deviceTypeRepo, BrandRepo brandRepo) {
        this.deviceRepo = deviceRepo;
        this.brandRepo= brandRepo;
        this.deviceTypeRepo = deviceTypeRepo;
    }

    public List<Device> listAllDevices() {
        return deviceRepo.findAll();
    }

    public Device findById(UUID id) {
    return deviceRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Device not found"));
    }

    public Device registerdevice(Device device) {

    Brand brand =
        brandRepo
            .findById(device.getBrand().getId())
            .orElseThrow(() -> new IllegalArgumentException("Brand not found"));

    DeviceType deviceType;
        deviceType = deviceTypeRepo
                .findById(device.getDeviceType().getId())
                .orElseThrow(()-> new IllegalArgumentException("Device not found"));

        device.setBrand(brand);
    device.setDeviceType(deviceType);
        return deviceRepo.save(device);
    }


    public void deleteById(UUID id) {
        deviceRepo.deleteById(id);
    }



}
