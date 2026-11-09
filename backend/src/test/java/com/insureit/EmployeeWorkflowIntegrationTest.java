package com.insureit;

import com.insureit.repositories.EmployeeRepo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.security.user.name=test-user", "spring.security.user.password=test-password"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EmployeeWorkflowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EmployeeRepo employees;

    @Test void createReturnsLocationAndPersistsSelectableEmployee() throws Exception {
        var result = mvc.perform(post("/api/employees").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeNumber\":\" EMP-UI-01 \",\"fullName\":\" Jane Doe \",\"email\":\" \",\"department\":\" Finance \"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.employeeNumber").value("EMP-UI-01"))
                .andExpect(jsonPath("$.fullName").value("Jane Doe"))
                .andExpect(jsonPath("$.department").value("Finance"))
                .andReturn();
        var id = java.util.UUID.fromString(json.readTree(result.getResponse().getContentAsString()).path("id").asText());
        assertThat(employees.findById(id).orElseThrow().getEmail()).isNull();
        String location = result.getResponse().getHeader("Location");
        assertThat(location).endsWith("/api/employees/" + id);
        mvc.perform(get("/api/employees/" + id).with(httpBasic("test-user", "test-password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Jane Doe"));
        mvc.perform(get("/api/employees").with(httpBasic("test-user", "test-password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == '" + id + "')].fullName").value(org.hamcrest.Matchers.hasItem("Jane Doe")));
    }
    @Test void invalidCreationDoesNotWriteRecords() throws Exception {
        long before = employees.count();
        for (String body : new String[]{"{}", "{\"employeeNumber\":\" \",\"fullName\":\"Jane\"}",
                "{\"employeeNumber\":\"E1\",\"fullName\":\" \"}", "null", "{"}) {
            mvc.perform(post("/api/employees").with(httpBasic("test-user", "test-password")).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        assertThat(employees.count()).isEqualTo(before);
    }
    @Test void creationRequiresAuthenticationAndCsrfOutsideLocalProfile() throws Exception {
        mvc.perform(post("/api/employees").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/employees").with(httpBasic("test-user", "test-password"))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }
}
