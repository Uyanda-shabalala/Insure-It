package com.insureit;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"groq.api.key=test-key", "groq.model=test-vision-model",
        "spring.security.user.name=test-user", "spring.security.user.password=test-password"})
@AutoConfigureMockMvc
class GroqApiIntegrationTest {
    private static final AtomicReference<String> BODY = new AtomicReference<>();
    private static final AtomicReference<String> REQUEST = new AtomicReference<>();
    private static final AtomicReference<String> AUTHORIZATION = new AtomicReference<>();
    private static final AtomicInteger STATUS = new AtomicInteger(200);
    private static final HttpServer SERVER = startServer();
    private static final String ENDPOINT = "/api/groq/serial-number";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private static HttpServer startServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/chat/completions", exchange -> {
                REQUEST.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                AUTHORIZATION.set(exchange.getRequestHeaders().getFirst("Authorization"));
                byte[] response = BODY.get().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(STATUS.get(), response.length);
                try (var output = exchange.getResponseBody()) {
                    output.write(response);
                }
            });
            server.start();
            return server;
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("groq.api.url", () -> "http://127.0.0.1:" + SERVER.getAddress().getPort() + "/chat/completions");
    }

    @BeforeEach
    void reset() {
        STATUS.set(200);
        REQUEST.set(null);
        answer("{\"serialNumber\":\"ABC123\",\"status\":\"FOUND\"}");
    }

    @AfterAll
    static void stopServer() {
        SERVER.stop(0);
    }

    private void answer(String content) {
        BODY.set(mapper.writeValueAsString(Map.of("choices", new Object[]{
                Map.of("message", Map.of("content", content))})));
    }

    @Test
    void extractsSerialAndSendsExpectedGroqPayload() throws Exception {
        mvc.perform(post(ENDPOINT).with(httpBasic("test-user", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"base64Image\":\"aW1hZ2U=\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.serialNumber").value("ABC123"))
                .andExpect(jsonPath("$.status").value("FOUND"));
        JsonNode request = mapper.readTree(REQUEST.get());
        assertThat(AUTHORIZATION.get()).isEqualTo("Bearer test-key");
        assertThat(request.path("model").asText()).isEqualTo("test-vision-model");
        assertThat(request.path("response_format").path("type").asText()).isEqualTo("json_object");
        assertThat(request.path("messages").path(0).path("content").path(1).path("image_url").path("url").asText())
                .isEqualTo("data:image/jpeg;base64,aW1hZ2U=");
    }

    @Test
    void returnsNotFoundAndPreservesDataUrl() throws Exception {
        answer("{\"serialNumber\":null,\"status\":\"NOT_FOUND\"}");
        mvc.perform(post(ENDPOINT).with(httpBasic("test-user", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base64Image\":\"data:image/png;base64,aW1hZ2U=\"}"))
                .andExpect(status().isOk()).andExpect(content().json("{\"serialNumber\":null,\"status\":\"NOT_FOUND\"}"));
        assertThat(REQUEST.get()).contains("data:image/png;base64,aW1hZ2U=");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "null", "{", "{\"base64Image\":\"\"}",
            "{\"base64Image\":\"bad base64!\"}", "{\"base64Image\":\"data:text/plain;base64,YQ==\"}"})
    void rejectsInvalidInput(String request) throws Exception {
        mvc.perform(post(ENDPOINT).with(httpBasic("test-user", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isBadRequest());
        assertThat(REQUEST.get()).isNull();
    }

    @Test
    void rejectsOversizedImage() throws Exception {
        mvc.perform(post(ENDPOINT).with(httpBasic("test-user", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("base64Image", "A".repeat(4_000_004)))))
                .andExpect(status().isPayloadTooLarge());
        assertThat(REQUEST.get()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"not json", "{}", "null", "{\"serialNumber\":null,\"status\":\"FOUND\"}",
            "{\"serialNumber\":\"ABC\",\"status\":\"NOT_FOUND\"}"})
    void rejectsMalformedModelAnswers(String answer) throws Exception {
        answer(answer);
        mvc.perform(post(ENDPOINT).with(httpBasic("test-user", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"base64Image\":\"YQ==\"}"))
                .andExpect(status().isBadGateway());
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 429, 500})
    void mapsUpstreamErrorsWithoutExposingDetails(int upstreamStatus) throws Exception {
        STATUS.set(upstreamStatus);
        BODY.set("{\"error\":\"sensitive upstream details\"}");
        mvc.perform(post(ENDPOINT).with(httpBasic("test-user", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"base64Image\":\"YQ==\"}"))
                .andExpect(status().is(upstreamStatus == 429 ? 429 : 502))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).doesNotContain("sensitive"));
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base64Image\":\"YQ==\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(REQUEST.get()).isNull();
    }
}
