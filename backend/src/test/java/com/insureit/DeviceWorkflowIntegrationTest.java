package com.insureit;

import com.insureit.models.*;
import com.insureit.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.security.user.name=test-user", "spring.security.user.password=test-password"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DeviceWorkflowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired BrandRepo brands;
    @Autowired DeviceTypeRepo types;
    @Autowired EmployeeRepo employees;
    @Autowired DeviceRepo devices;
    @Autowired DeviceAssignmentRepo assignments;
    @Autowired com.insureit.services.DeviceAssignmentService assignmentService;
    UUID brandId, typeId, employeeId;

    @BeforeEach void prepare() {
        assignments.deleteAll(); devices.deleteAll(); employees.deleteAll(); brands.deleteAll(); types.deleteAll();
        Brand brand = new Brand(); brand.setName("Dell"); brandId = brands.save(brand).getId();
        DeviceType type = new DeviceType(); type.setName("Laptop"); typeId = types.save(type).getId();
        Employee employee = new Employee(); employee.setEmployeeNumber("EMP001"); employee.setFullName("Test Employee");
        employeeId = employees.save(employee).getId();
    }
    UUID register() throws Exception {
        String body = json.writeValueAsString(Map.of("name", "Finance laptop", "serialNumber", "SERIAL001",
                "brandId", brandId, "deviceTypeId", typeId, "model", "Latitude", "location", "Finance"));
        String response = mvc.perform(post("/api/devices").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.brand").value("Dell")).andExpect(jsonPath("$.deviceType").value("Laptop"))
                .andExpect(jsonPath("$.status").value("available")).andReturn().getResponse().getContentAsString();
        return UUID.fromString(json.readTree(response).path("id").asText());
    }
    @Test void repairsAndLossPreserveHolderAndRetirementIsTerminal() throws Exception {
        UUID id = register();
        assignmentService.assign(id, employeeId);
        state(id, "send_for_repair", "repair");
        assertThat(assignmentService.current(id).employee().id()).isEqualTo(employeeId);
        state(id, "complete_repair", "assigned");
        state(id, "mark_lost", "lost");
        state(id, "recover", "assigned");
        mvc.perform(patch("/api/devices/" + id + "/state").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"retire\"}"))
                .andExpect(status().isConflict());
        assignmentService.returnDevice(id);
        state(id, "send_for_repair", "repair"); state(id, "complete_repair", "available");
        state(id, "retire", "retired");
        assertThatThrownBy(() -> assignmentService.assign(id, employeeId)).hasMessageContaining("not available");
    }
    void state(UUID id, String action, String expected) throws Exception {
        mvc.perform(patch("/api/devices/" + id + "/state").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("action", action))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(expected));
    }
    @Test void normalizedExistingSerialCannotBeRegisteredAgain() throws Exception {
        register();
        mvc.perform(post("/api/devices").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name", "Other laptop", "serialNumber", " serial001 ", "brandId", brandId, "deviceTypeId", typeId))))
                .andExpect(status().isConflict());
    }
    @Test void optionalInsuranceCanBeCreatedLinkedAndRemoved() throws Exception {
        var jdbc = new org.springframework.jdbc.core.JdbcTemplate(dataSource);
        jdbc.execute("create table if not exists insurance_providers (id uuid primary key, name varchar(120) not null, phone_number varchar(30))");
        jdbc.update("delete from insurance_providers");
        UUID id = register();
        var provider = mvc.perform(post("/api/insurance-providers").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"QA Cover\",\"phoneNumber\":\"+27 11 555 1234\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.phoneNumber").value("+27 11 555 1234")).andReturn().getResponse().getContentAsString();
        var policy = mvc.perform(post("/api/insurance-policies").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("providerId", json.readTree(provider).path("id").asText(), "policyNumber", "POL-" + id, "startDate", "2026-01-01", "endDate", "2027-01-01"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(patch("/api/devices/" + id + "/insurance").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("policyId", json.readTree(policy).path("id").asText(), "insuredValue", 2500))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.insurancePolicy.insurerName").value("QA Cover"));
        mvc.perform(patch("/api/devices/" + id + "/insurance").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"policyId\":null}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.insurancePolicy").isEmpty());
    }
    @Autowired javax.sql.DataSource dataSource;
    @Test void registerListAssignAndReturnPersistTogether() throws Exception {
        UUID id = register();
        mvc.perform(get("/api/devices").with(httpBasic("test-user", "test-password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id.toString()));
        mvc.perform(get("/api/brands").with(httpBasic("test-user", "test-password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Dell"));
        mvc.perform(get("/api/device-types").with(httpBasic("test-user", "test-password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Laptop"));
        mvc.perform(get("/api/devices/" + id + "/assignment").with(httpBasic("test-user", "test-password")))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/devices/" + id + "/assign").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("employeeId", employeeId))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.employee.fullName").value("Test Employee"));
        assertThat(devices.findById(id).orElseThrow().getStatus()).isEqualTo("assigned");
        mvc.perform(get("/api/devices/" + id + "/assignment").with(httpBasic("test-user", "test-password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.employee.id").value(employeeId.toString()));
        mvc.perform(post("/api/devices/" + id + "/assign").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("employeeId", employeeId))))
                .andExpect(status().isConflict());
        assertThat(assignments.count()).isEqualTo(1);
        mvc.perform(post("/api/devices/" + id + "/return").with(httpBasic("test-user", "test-password")).with(csrf()))
                .andExpect(status().isNoContent());
        assertThat(devices.findById(id).orElseThrow().getStatus()).isEqualTo("available");
        assertThat(assignments.findAll().get(0).getReturnedAt()).isNotNull();
        mvc.perform(post("/api/devices/" + id + "/return").with(httpBasic("test-user", "test-password")).with(csrf()))
                .andExpect(status().isConflict());
    }
    @Test void invalidEmployeeAndMissingDeviceDoNotWriteAssignments() throws Exception {
        UUID id = register();
        mvc.perform(post("/api/devices/" + id + "/assign").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("employeeId", UUID.randomUUID()))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/devices/" + UUID.randomUUID() + "/assign").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("employeeId", employeeId))))
                .andExpect(status().isNotFound());
        assertThat(assignments.count()).isZero();
        assertThat(devices.findById(id).orElseThrow().getStatus()).isEqualTo("available");
    }
    @Test void concurrentAssignRequestsCreateOnlyOneOpenAssignment() throws Exception {
        UUID id = register();
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var start = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<Integer> assign = () -> {
                start.await();
                try { assignmentService.assign(id, employeeId); return 200; }
                catch (com.insureit.errors.DeviceApiException e) { return e.status().value(); }
            };
            var first = executor.submit(assign); var second = executor.submit(assign); start.countDown();
            assertThat(java.util.List.of(first.get(), second.get())).containsExactlyInAnyOrder(200, 409);
        } finally { executor.shutdownNow(); }
        assertThat(assignments.count()).isEqualTo(1);
        assertThat(devices.findById(id).orElseThrow().getStatus()).isEqualTo("assigned");
    }
    @Test void returnDoesNotMakeARepairDeviceAvailable() throws Exception {
        UUID id = register(); assignmentService.assign(id, employeeId);
        Device device = devices.findById(id).orElseThrow(); device.setStatus("repair"); devices.save(device);
        mvc.perform(post("/api/devices/" + id + "/return").with(httpBasic("test-user", "test-password")).with(csrf()))
                .andExpect(status().isConflict());
        assertThat(devices.findById(id).orElseThrow().getStatus()).isEqualTo("repair");
        assertThat(assignments.findAll().get(0).getReturnedAt()).isNull();
    }
    @Test void duplicateSerialAndMissingReferenceAreRejected() throws Exception {
        register();
        mvc.perform(post("/api/devices").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name", "Duplicate",
                        "serialNumber", "SERIAL001", "brandId", brandId, "deviceTypeId", typeId))))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/devices").with(httpBasic("test-user", "test-password")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Missing references\"}"))
                .andExpect(status().isBadRequest());
        assertThat(devices.count()).isEqualTo(1);
    }
}
