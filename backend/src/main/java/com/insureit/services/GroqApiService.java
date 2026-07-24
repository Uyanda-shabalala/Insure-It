package com.insureit.services;


import jdk.internal.ValueBased;
import jdk.internal.classfile.impl.BufferedCodeBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GroqApiService {

    @Value("${api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    private static final String MODEL = "qwen/qwen3.6-27b";

    public GroqResponse sendToGroq(String base64Image) {

        // Build request DTO

        // Send HTTP request

        // Convert JSON to GroqResponse

        // Return GroqResponse

    }
}