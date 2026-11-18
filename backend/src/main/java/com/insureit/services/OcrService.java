package com.insureit.services;

import com.insureit.models.SerialNumberResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OcrService {
    private final GroqApiService groq;
    private final FallbackOcrService fallback;
    private final boolean enabled;

    public OcrService(GroqApiService groq, FallbackOcrService fallback,
                      @Value("${ocr.fallback.enabled:false}") boolean enabled) {
        this.groq = groq;
        this.fallback = fallback;
        this.enabled = enabled;
    }

    public SerialNumberResponse extract(String image) {
        // Reject caller errors before either provider, including when Groq has no key.
        String normalized = groq.validateImage(image);
        try {
            return groq.sendToGroq(normalized);
        } catch (ResponseStatusException exception) {
            int code = exception.getStatusCode().value();
            if (!enabled || !(code == 429 || code == 502 || code == 503 || code == 504)) throw exception;
            return fallback.extract(normalized);
        }
    }
}
