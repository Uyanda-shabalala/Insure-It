package com.insureit.services;

import com.insureit.models.BrandResponse;
import com.insureit.repositories.BrandRepo;
import com.insureit.repositories.DeviceRepo;
import com.insureit.repositories.DeviceTypeRepo;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BrandService {

    private final BrandRepo brandRepo;

    public BrandService(BrandRepo brandRepo) {
        this.brandRepo = brandRepo;
    }

    public List<BrandResponse> getAllBrands() {
        return brandRepo.findAll()
                .stream()
                .map(brand -> new BrandResponse(
                        brand.getId(),
                        brand.getName()
                ))
                .toList();
    }
}
