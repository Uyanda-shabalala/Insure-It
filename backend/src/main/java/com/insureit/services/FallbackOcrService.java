package com.insureit.services;

import com.insureit.models.SerialNumberResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.time.Duration;
import java.util.Base64;

@Service
public class FallbackOcrService {
    private final RestClient client;
    private final String url;

    public FallbackOcrService(RestClient.Builder builder,
            @Value("${ocr.fallback.url:http://127.0.0.1:8001/ocr}") String url,
            @Value("${ocr.fallback.connect-timeout:2s}") Duration connectTimeout,
            @Value("${ocr.fallback.read-timeout:120s}") Duration readTimeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        client = builder.requestFactory(factory).build();
        this.url = url;
    }

    // The orchestrator supplies a validated, normalized data URL.
    public SerialNumberResponse extract(String image) {
        int comma = image.indexOf(',');
        String mime = image.substring(5, image.indexOf(';'));
        byte[] bytes = Base64.getDecoder().decode(image.substring(comma + 1));
        var resource = new ByteArrayResource(bytes) {
            @Override public String getFilename() { return "image"; }
        };
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(mime));
        var parts = new LinkedMultiValueMap<String, Object>();
        parts.add("file", new HttpEntity<>(resource, headers));
        try {
            JsonNode body = client.post().uri(url).contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts).retrieve().body(JsonNode.class);
            if (body == null || !body.isObject()) throw invalidResponse();
            String status = body.path("status").asText();
            JsonNode serial = body.path("serial");
            if ("not_detected".equals(status) && serial.isNull()) {
                return new SerialNumberResponse(null, SerialNumberResponse.Status.NOT_FOUND, "fallback", false);
            }
            if (("ok".equals(status) || "low_confidence".equals(status))
                    && serial.isString() && !serial.asText().isBlank() && serial.asText().length() <= 128) {
                var mapped = "ok".equals(status) ? SerialNumberResponse.Status.FOUND
                        : SerialNumberResponse.Status.REVIEW_REQUIRED;
                return new SerialNumberResponse(serial.asText().strip(), mapped, "fallback", true);
            }
            throw invalidResponse();
        } catch (ResourceAccessException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Backup OCR is unavailable or timed out; enter the serial manually");
        } catch (RestClientException exception) {
            // Response conversion can wrap a socket read timeout in RestClientException.
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof java.net.SocketTimeoutException) {
                    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                            "Backup OCR timed out; enter the serial manually");
                }
            }
            throw invalidResponse();
        }
    }

    private ResponseStatusException invalidResponse() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Backup OCR could not return a valid result; enter the serial manually");
    }
}
