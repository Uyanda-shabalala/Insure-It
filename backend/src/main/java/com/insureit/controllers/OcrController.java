package com.insureit.controllers;

import com.insureit.models.SerialNumberResponse;
import com.insureit.services.OcrService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Base64;
import java.util.Set;

@RestController
public class OcrController {
    private final OcrService service;
    public OcrController(OcrService service) { this.service = service; }
    public record Request(String base64Image) {}

    @PostMapping(value = {"/api/ocr/serial-number", "/api/groq/serial-number"},
            consumes = MediaType.APPLICATION_JSON_VALUE)
    public SerialNumberResponse extract(@RequestBody Request request) {
        return service.extract(request == null ? null : request.base64Image());
    }

    @PostMapping(value = "/api/ocr/serial-number", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SerialNumberResponse upload(@RequestParam("image") MultipartFile image) throws IOException {
        if (image.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image is required");
        if (image.getSize() > 3_000_000) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "Image must be at most 3,000,000 bytes");
        String type = image.getContentType();
        if (type == null || !Set.of("image/jpeg", "image/png", "image/webp").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use JPEG, PNG or WebP");
        }
        return service.extract("data:" + type + ";base64," + Base64.getEncoder().encodeToString(image.getBytes()));
    }
}
