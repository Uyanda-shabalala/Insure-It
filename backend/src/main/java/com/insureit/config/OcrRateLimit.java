package com.insureit.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import java.time.Clock;
import java.util.*;

/** Counts images, including batch images. Forwarded headers are deliberately not trusted. */
@Configuration
public class OcrRateLimit implements WebMvcConfigurer, HandlerInterceptor {
    private final Map<String, Bucket> clients = new HashMap<>();
    private final Clock clock;
    private final int clientLimit, globalLimit;
    private Bucket global;
    private record Bucket(long minute, int used) {}
    @org.springframework.beans.factory.annotation.Autowired
    public OcrRateLimit(@Value("${ocr.rate-limit.per-client:20}") int clientLimit,
                        @Value("${ocr.rate-limit.global:60}") int globalLimit) {
        this(clientLimit, globalLimit, Clock.systemUTC());
    }
    public OcrRateLimit(int clientLimit, int globalLimit, Clock clock) {
        this.clientLimit = Math.max(1, clientLimit); this.globalLimit = Math.max(1, globalLimit); this.clock = clock;
    }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).addPathPatterns("/api/ocr/**", "/api/groq/serial-number");
    }
    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!request.getMethod().equals("POST")) return true;
        int weight = request instanceof MultipartHttpServletRequest multipart && request.getRequestURI().endsWith("/batch")
                ? Math.max(1, multipart.getFiles("images").size()) : 1;
        String identity = request.getUserPrincipal() == null ? request.getRemoteAddr() : "user:" + request.getUserPrincipal().getName();
        if (allow(identity, weight)) return true;
        response.setStatus(429); response.setContentType("application/json");
        response.setHeader("Retry-After", Long.toString(60 - Math.floorMod(clock.instant().getEpochSecond(), 60)));
        response.getWriter().write("{\"status\":429,\"message\":\"OCR limit reached. Wait a minute before trying again.\"}");
        return false;
    }
    public synchronized boolean allow(String identity, int weight) {
        long minute = clock.instant().getEpochSecond() / 60;
        clients.entrySet().removeIf(e -> e.getValue().minute() != minute);
        if (global == null || global.minute() != minute) global = new Bucket(minute, 0);
        Bucket client = clients.getOrDefault(identity, new Bucket(minute, 0));
        if (weight < 1 || weight > clientLimit - client.used() || weight > globalLimit - global.used() ||
                (!clients.containsKey(identity) && clients.size() >= 10000)) return false;
        clients.put(identity, new Bucket(minute, client.used() + weight));
        global = new Bucket(minute, global.used() + weight);
        return true;
    }
}
