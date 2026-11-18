package com.insureit;

import com.insureit.controllers.DeviceController;
import com.insureit.errors.*;
import com.insureit.services.DeviceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Map;
import java.util.UUID;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DeviceApiErrorTest {
    final DeviceService service = mock(DeviceService.class);
    MockMvc mvc;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new DeviceController(service))
                .setControllerAdvice(new DeviceErrorHandler()).build();
    }

    @Test void malformedPathUuidIsBadRequest() throws Exception {
        mvc.perform(get("/api/devices/not-a-uuid")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.id").exists());
        verifyNoInteractions(service);
    }

    @Test void malformedJsonUuidAndMissingBodyAreBadRequests() throws Exception {
        for (String body : new String[]{"{", "null", "", "{\"brandId\":\"not-a-uuid\"}", "{\"deviceTypeId\":\"invalid\"}"}) {
            mvc.perform(post("/api/devices").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").exists()).andExpect(jsonPath("$.trace").doesNotExist());
        }
        verifyNoInteractions(service);
    }

    @Test void validationFieldsAreReturned() throws Exception {
        when(service.registerdevice(any())).thenThrow(new DeviceApiException(HttpStatus.BAD_REQUEST,
                "Invalid device request", Map.of("name", "Name is required")));
        mvc.perform(post("/api/devices").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.name").value("Name is required"));
    }

    @Test void notFoundAndConflictUseSameJsonShape() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.findById(id)).thenThrow(new DeviceApiException(HttpStatus.NOT_FOUND, "Device not found"));
        mvc.perform(get("/api/devices/" + id)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404)).andExpect(jsonPath("$.message").value("Device not found"));
        when(service.registerdevice(any())).thenThrow(new DeviceApiException(HttpStatus.CONFLICT, "A device with this serial number already exists"));
        mvc.perform(post("/api/devices").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409));
    }

    @Test void unexpectedFailuresDoNotExposeInternalDetails() throws Exception {
        when(service.listAllDevices()).thenThrow(new RuntimeException("password=secret SQL select * from devices"));
        mvc.perform(get("/api/devices")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Unable to complete the device request."))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(content().string(not(containsString("secret"))));
    }
}
