package com.insureit.services;

import com.insureit.dto.DeviceRequest;
import com.insureit.models.Device;
import com.insureit.repositories.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository repo;

    public List<Device> findAll(UUID userId) {
        return repo.findByUserId(userId);
    }

    public Device findOne(UUID id, UUID userId) {
        // Scoped to the user, so someone else's device looks like it doesn't exist
        return repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
    }

    public Device create(DeviceRequest req, UUID userId) {
        validate(req);
        Device d = new Device();
        d.setUserId(userId);
        apply(d, req);
        return repo.save(d);
    }

    public Device update(UUID id, DeviceRequest req, UUID userId) {
        validate(req);
        Device d = findOne(id, userId);
        apply(d, req);
        return repo.save(d);
    }

    public void delete(UUID id, UUID userId) {
        repo.delete(findOne(id, userId));
    }

    private void validate(DeviceRequest req) {
        if (req == null || req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device name is required");
        }
    }

    private void apply(Device d, DeviceRequest r) {
        d.setName(r.name());
        d.setBrand(r.brand());
        d.setModel(r.model());
        d.setSerialNumber(r.serialNumber());
        d.setPurchaseDate(r.purchaseDate());
        d.setPurchasePrice(r.purchasePrice());
    }
}
