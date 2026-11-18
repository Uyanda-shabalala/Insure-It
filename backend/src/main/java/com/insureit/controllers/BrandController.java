package com.insureit.controllers;

import com.insureit.models.BrandResponse;
import com.insureit.repositories.BrandRepo;
import com.insureit.services.BrandService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
@RequestMapping("/api/brands")
public class BrandController {
    private final BrandService brandService;

    public BrandController(BrandService brandService) {
        this.brandService = brandService;
    }


    @GetMapping
    public ResponseEntity<List<BrandResponse>> getAllBrands() {

        List<BrandResponse> brands = brandService.getAllBrands();

        return ResponseEntity.ok(brands);
    }
}