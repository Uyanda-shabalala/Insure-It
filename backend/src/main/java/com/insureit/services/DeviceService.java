package com.insureit.services;

import com.insureit.models.*;
import com.insureit.errors.DeviceApiException;
import org.springframework.http.HttpStatus;
import java.util.LinkedHashMap;
import java.util.Map;
import com.insureit.repositories.BrandRepo;
import com.insureit.repositories.DeviceRepo;
import com.insureit.repositories.DeviceTypeRepo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class DeviceService {
    private final DeviceRepo deviceRepo;
    private final DeviceTypeRepo deviceTypeRepo;
    private final BrandRepo brandRepo;

    public DeviceService(DeviceRepo deviceRepo, DeviceTypeRepo deviceTypeRepo, BrandRepo brandRepo) {
        this.deviceRepo = deviceRepo;
        this.brandRepo= brandRepo;
        this.deviceTypeRepo = deviceTypeRepo;
    }

    public List<DeviceResponse> listAllDevices() {


          List<Device> devices=     deviceRepo.findAll();

          List<DeviceResponse> formatedDevices= devices.stream().map
                  (this::toDeviceResponse).toList();

        return formatedDevices;
    }

    public DeviceResponse findById(UUID id) {

        Device device =   deviceRepo.findById(id).orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "Device not found"));


    return   toDeviceResponse(device);
    }

    @org.springframework.transaction.annotation.Transactional
    public DeviceResponse registerdevice(CreateDeviceRequest request) {
        validateRequest(request);



        Device device = new Device();



        device.setName(TextInput.text(request.name(), "name", true, 120));
        device.setSerialNumber(TextInput.serial(request.serialNumber()));
        device.setModel(TextInput.text(request.model(), "model", false, 120));
        device.setBrand(brandRepo.findById(request.brandId()).orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "Brand not found")));
        device.setDeviceType(deviceTypeRepo.findById(request.deviceTypeId()).orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "Device type not found")));
        device.setStatus("available");
        device.setLocation(TextInput.text(request.location(), "location", false, 120));

        Device savedDevice;
        if (device.getSerialNumber() != null && deviceRepo.existsNormalizedSerial(device.getSerialNumber())) {
            throw new DeviceApiException(HttpStatus.CONFLICT, "A device with this serial number already exists");
        }{
            savedDevice = deviceRepo.save(device);
}
        return toDeviceResponse(savedDevice);
    }


    @org.springframework.transaction.annotation.Transactional
    public void deleteById(UUID id) {
        deviceRepo.deleteById(id);
    }




    private void validateRequest(CreateDeviceRequest request) {
        if (request == null) {
            throw new DeviceApiException(HttpStatus.BAD_REQUEST, "Device request body is required");
        }
        Map<String, String> fields = new LinkedHashMap<>();
        if (request.name() == null || request.name().isBlank()) fields.put("name", "Name is required");
        if (request.brandId() == null) fields.put("brandId", "Brand id is required");
        if (request.deviceTypeId() == null) fields.put("deviceTypeId", "Device type id is required");
        if (!fields.isEmpty()) throw new DeviceApiException(HttpStatus.BAD_REQUEST, "Invalid device request", fields);
    }
private DeviceResponse toDeviceResponse(Device device) {

    return new DeviceResponse(
            device.getId(),
            device.getName(),
            device.getSerialNumber(),
            device.getModel(),
            device.getBrand().getName(),
            device.getDeviceType().getName(),
            device.getLocation(),
            device.getStatus(),
            device.getCreatedAt(), device.getUpdatedAt(), device.getPurchaseDate(), device.getInsuredValue(),
            device.getInsurancePolicy() == null ? null : new DeviceResponse.PolicyResponse(
                device.getInsurancePolicy().getId(), device.getInsurancePolicy().getPolicyNumber(),
                device.getInsurancePolicy().getInsurerName(), device.getInsurancePolicy().getStartDate(),
                device.getInsurancePolicy().getEndDate())
    );


    }
}
