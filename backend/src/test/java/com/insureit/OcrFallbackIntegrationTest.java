package com.insureit;

import com.insureit.controllers.OcrController;
import com.insureit.models.SerialNumberResponse;
import com.insureit.services.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class OcrFallbackIntegrationTest {
    HttpServer server;
    ExecutorService executor;
    int groqStatus;
    String groqBody, fallbackBody, fallbackRequest, fallbackContentType;
    int fallbackStatus;
    long delay;
    AtomicInteger groqCalls = new AtomicInteger(), fallbackCalls = new AtomicInteger();
    ObjectMapper mapper = new ObjectMapper();

    @BeforeEach void start() throws Exception {
        groqStatus = 503; fallbackStatus = 200;
        groqBody = "{}";
        fallbackBody = "{\"status\":\"ok\",\"serial\":\"ABC12345\"}";
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newCachedThreadPool(); server.setExecutor(executor);
        server.createContext("/groq", exchange -> {
            groqCalls.incrementAndGet(); exchange.getRequestBody().readAllBytes();
            byte[] data = groqBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(groqStatus, data.length);
            try (var out = exchange.getResponseBody()) { out.write(data); }
        });
        server.createContext("/ocr", exchange -> {
            fallbackCalls.incrementAndGet();
            fallbackRequest = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            fallbackContentType = exchange.getRequestHeaders().getFirst("Content-Type");
            try { Thread.sleep(delay); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            byte[] data = fallbackBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(fallbackStatus, data.length);
            try (var out = exchange.getResponseBody()) { out.write(data); }
        });
        server.start();
    }
    @AfterEach void stop() { server.stop(0); executor.shutdownNow(); }
    String url(String path) { return "http://127.0.0.1:" + server.getAddress().getPort() + path; }
    OcrService service(boolean enabled, String key, String fallbackUrl, Duration timeout) {
        var groq = new GroqApiService(RestClient.builder(), mapper, key, url("/groq"), "test",
                Duration.ofSeconds(1), Duration.ofSeconds(1));
        var fallback = new FallbackOcrService(RestClient.builder(), fallbackUrl,
                Duration.ofSeconds(1), timeout);
        return new OcrService(groq, fallback, enabled);
    }
    OcrService service(boolean enabled) { return service(enabled, "test", url("/ocr"), Duration.ofSeconds(2)); }
    void groqAnswer(String status, String serial) {
        groqStatus = 200;
        String content = mapper.writeValueAsString(Map.of("status", status, "serialNumber", serial));
        groqBody = mapper.writeValueAsString(Map.of("choices", new Object[]{Map.of("message", Map.of("content", content))}));
    }

    @Test void groqSuccessDoesNotCallFallback() {
        groqAnswer("FOUND", "GROQ123");
        assertThat(service(true).extract("YQ==").serialNumber()).isEqualTo("GROQ123");
        assertThat(fallbackCalls.get()).isZero();
    }
    @Test void groqNotFoundDoesNotCallFallback() {
        groqStatus = 200;
        groqBody = "{\"choices\":[{\"message\":{\"content\":\"{\\\"status\\\":\\\"NOT_FOUND\\\",\\\"serialNumber\\\":null}\"}}]}";
        assertThat(service(true).extract("YQ==").status()).isEqualTo(SerialNumberResponse.Status.NOT_FOUND);
        assertThat(fallbackCalls.get()).isZero();
    }
    @ParameterizedTest @ValueSource(ints={401,429,500,503})
    void providerFailuresSendActualMultipartToFallback(int status) {
        groqStatus = status;
        var result = service(true).extract("data:image/png;base64,aW1hZ2U=");
        assertThat(result.serialNumber()).isEqualTo("ABC12345");
        assertThat(result.source()).isEqualTo("fallback");
        assertThat(result.requiresReview()).isTrue();
        assertThat(fallbackCalls.get()).isEqualTo(1);
        assertThat(fallbackContentType).startsWith("multipart/form-data;");
        assertThat(fallbackRequest).contains("name=\"file\"", "Content-Type: image/png", "image");
    }
    @Test void invalidGroqAnswerFallsBack() {
        groqStatus = 200; groqBody = "{\"choices\":[]}";
        assertThat(service(true).extract("YQ==").source()).isEqualTo("fallback");
    }
    @Test void disabledPreservesGroqFailure() {
        assertThatThrownBy(() -> service(false).extract("YQ==")).isInstanceOf(ResponseStatusException.class);
        assertThat(fallbackCalls.get()).isZero();
    }
    @Test void missingKeyUsesFallback() {
        assertThat(service(true, "", url("/ocr"), Duration.ofSeconds(1)).extract("YQ==").source()).isEqualTo("fallback");
        assertThat(groqCalls.get()).isZero();
    }
    @Test void lowConfidenceRequiresReview() {
        fallbackBody = "{\"status\":\"low_confidence\",\"serial\":\"MAYBE123\"}";
        var result = service(true).extract("YQ==");
        assertThat(result.status()).isEqualTo(SerialNumberResponse.Status.REVIEW_REQUIRED);
        assertThat(result.requiresReview()).isTrue();
    }
    @Test void genuineNotDetectedIsNotAnOutage() {
        fallbackBody = "{\"status\":\"not_detected\",\"serial\":null}";
        assertThat(service(true).extract("YQ==").status()).isEqualTo(SerialNumberResponse.Status.NOT_FOUND);
    }
    @ParameterizedTest @ValueSource(strings={"not json", "{}", "null",
            "{\"status\":\"ok\",\"serial\":null}", "{\"status\":\"not_detected\",\"serial\":\"ABC\"}"})
    void malformedFallbackIsGatewayError(String body) {
        fallbackBody = body;
        assertThatThrownBy(() -> service(true).extract("YQ=="))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(502));
    }
    @Test void upstreamErrorDoesNotLeakBody() {
        fallbackStatus = 500; fallbackBody = "sensitive upstream details";
        assertThatThrownBy(() -> service(true).extract("YQ=="))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode().value()).isEqualTo(502);
                    assertThat(e.getReason()).doesNotContain("sensitive");
                });
    }
    @Test void timeoutIsServiceUnavailable() {
        delay = 500;
        assertThatThrownBy(() -> service(true, "test", url("/ocr"), Duration.ofMillis(50)).extract("YQ=="))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(503));
    }
    @Test void invalidInputNeverCallsProviders() {
        assertThatThrownBy(() -> service(true).extract("bad base64!"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
        assertThat(groqCalls.get()).isZero(); assertThat(fallbackCalls.get()).isZero();
    }
    @Test void multipartEndpointPreservesPngAndReviewStatus() throws Exception {
        fallbackBody = "{\"status\":\"low_confidence\",\"serial\":\"ABC123\"}";
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new OcrController(service(true))).build();
        mvc.perform(multipart("/api/ocr/serial-number").file(new MockMultipartFile("image", "label.png", "image/png", "image".getBytes())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.requiresReview").value(true));
        assertThat(fallbackRequest).contains("Content-Type: image/png");
    }
    @Test void jsonEndpointAcceptsExistingPayload() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new OcrController(service(true))).build();
        mvc.perform(post("/api/ocr/serial-number").contentType(MediaType.APPLICATION_JSON)
                .content("{\"base64Image\":\"YQ==\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.source").value("fallback"));
    }
    @Test void localApplicationStartsAndServesFallbackOverHttp() throws Exception {
        try (var context = org.springframework.boot.SpringApplication.run(InsureItApplication.class,
                "--spring.profiles.active=local", "--spring.config.import=classpath:application-ocr-only.properties",
                "--server.port=0", "--groq.api.key=test", "--groq.api.url=" + url("/groq"),
                "--ocr.fallback.enabled=true", "--ocr.fallback.url=" + url("/ocr"))) {
            int port = ((org.springframework.boot.web.server.context.WebServerApplicationContext) context)
                    .getWebServer().getPort();
            var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create(
                    "http://127.0.0.1:" + port + "/api/ocr/serial-number"))
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString("{\"base64Image\":\"YQ==\"}")).build();
            var response = java.net.http.HttpClient.newHttpClient().send(request,
                    java.net.http.HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(mapper.readTree(response.body()).path("source").asText()).isEqualTo("fallback");
            assertThat(fallbackCalls.get()).isEqualTo(1);
        }
    }
}
