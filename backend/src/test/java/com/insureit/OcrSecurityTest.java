package com.insureit;

import com.insureit.config.SecurityConfig;
import com.insureit.controllers.OcrController;
import com.insureit.models.SerialNumberResponse;
import com.insureit.services.OcrService;
import com.insureit.services.BatchOCRService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = OcrController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("local")
class OcrSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean OcrService service;
    @MockitoBean BatchOCRService batch;
    static MockMultipartFile image() {
        return new MockMultipartFile("image", "device.png", "image/png", new byte[]{1, 2, 3});
    }
    @Test void localMultipartPreservesImageType() throws Exception {
        when(service.extract("data:image/png;base64,AQID")).thenReturn(
                new SerialNumberResponse("ABC123", SerialNumberResponse.Status.FOUND));
        mvc.perform(multipart("/api/ocr/serial-number").file(image()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.serialNumber").value("ABC123"));
        verify(service).extract("data:image/png;base64,AQID");
    }
    @Test void localApiAccessIsExplicitButNonApiStillRequiresAuthentication() throws Exception {
        // No device controller in this MVC slice: 404 proves the request passed security.
        mvc.perform(get("/api/devices")).andExpect(status().isNotFound());
        mvc.perform(get("/private")).andExpect(status().isUnauthorized());
    }
    @Test void invalidUploadNeverCallsProviders() throws Exception {
        mvc.perform(multipart("/api/ocr/serial-number").file(
                new MockMultipartFile("image", "x.txt", "text/plain", new byte[]{1})))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}

@WebMvcTest(controllers = OcrController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class OcrDefaultSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean OcrService service;
    @MockitoBean BatchOCRService batch;
    @Test void ocrRequiresAuthenticationAndCsrfByDefault() throws Exception {
        mvc.perform(multipart("/api/ocr/serial-number").file(OcrSecurityTest.image()))
                .andExpect(status().isForbidden());
        mvc.perform(multipart("/api/ocr/serial-number").file(OcrSecurityTest.image()).with(csrf()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
}

@ActiveProfiles({"local", "production"})
class OcrProductionSecurityTest extends OcrDefaultSecurityTest {}
