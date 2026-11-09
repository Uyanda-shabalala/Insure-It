package com.insureit.controllers;

import com.insureit.models.*;
import com.insureit.repositories.*;
import com.insureit.services.*;
import com.insureit.errors.DeviceApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class InsuranceController {
    private final JdbcTemplate jdbc;
    private final InsurancePolicyRepo policies;
    private final DeviceRepo devices;
    private final DeviceService service;
    public record Provider(UUID id, String name, String phoneNumber) {}
    public record ProviderRequest(String name, String phoneNumber) {}
    public record PolicyRequest(UUID providerId, String policyNumber, LocalDate startDate, LocalDate endDate) {}
    public record CoverRequest(UUID policyId, BigDecimal insuredValue) {}
    public InsuranceController(JdbcTemplate jdbc, InsurancePolicyRepo policies, DeviceRepo devices, DeviceService service) {
        this.jdbc = jdbc; this.policies = policies; this.devices = devices; this.service = service;
    }
    @GetMapping("/insurance-providers")
    public List<Provider> providers() {
        try {
            return jdbc.query("select id, name, phone_number from insurance_providers order by name",
                    (r, n) -> new Provider(r.getObject("id", UUID.class), r.getString("name"), r.getString("phone_number")));
        } catch (BadSqlGrammarException ex) {
            throw new DeviceApiException(HttpStatus.SERVICE_UNAVAILABLE, "Insurance provider setup is pending. Apply the insurance provider database migration.");
        }
    }
    @PostMapping("/insurance-providers")
    @ResponseStatus(HttpStatus.CREATED)
    public Provider createProvider(@RequestBody ProviderRequest request) {
        String name = TextInput.text(request.name(), "name", true, 120);
        String phone = request.phoneNumber() == null ? null : request.phoneNumber().strip();
        if (phone != null && phone.isEmpty()) phone = null;
        if (phone != null && (phone.length() > 30 || !phone.matches("\\+?[0-9 ()-]{7,30}") || phone.replaceAll("[^0-9]", "").length() < 7))
            throw new DeviceApiException(HttpStatus.BAD_REQUEST, "Enter a valid provider phone number");
        providers(); // Return an actionable setup error before attempting a write.
        UUID id = UUID.randomUUID();
        jdbc.update("insert into insurance_providers(id,name,phone_number) values (?,?,?)", id, name, phone);
        return new Provider(id, name, phone);
    }
    @GetMapping("/insurance-policies")
    @Transactional(readOnly = true)
    public List<DeviceResponse.PolicyResponse> policies() {
        return policies.findAll().stream().map(this::response).toList();
    }
    @PostMapping("/insurance-policies")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public DeviceResponse.PolicyResponse createPolicy(@RequestBody PolicyRequest request) {
        var provider = providers().stream().filter(p -> p.id().equals(request.providerId())).findFirst()
                .orElseThrow(() -> new DeviceApiException(HttpStatus.BAD_REQUEST, "Select an insurance provider"));
        String number = TextInput.text(request.policyNumber(), "policyNumber", true, 120);
        if (request.startDate() == null || request.endDate() == null || request.endDate().isBefore(request.startDate()))
            throw new DeviceApiException(HttpStatus.BAD_REQUEST, "Provide cover dates with the end on or after the start");
        if (policies.existsByInsurerNameIgnoreCaseAndPolicyNumberIgnoreCase(provider.name(), number))
            throw new DeviceApiException(HttpStatus.CONFLICT, "This provider already has a policy with that number");
        var policy = new InsurancePolicy();
        policy.setInsurerName(provider.name()); policy.setPolicyNumber(number);
        policy.setStartDate(request.startDate()); policy.setEndDate(request.endDate());
        return response(policies.save(policy));
    }
    @PatchMapping("/devices/{id}/insurance")
    @Transactional
    public DeviceResponse link(@PathVariable UUID id, @RequestBody CoverRequest request) {
        var device = devices.lockById(id).orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "Device not found"));
        if (request.insuredValue() != null && (request.insuredValue().signum() < 0 || request.insuredValue().precision() > 14 || request.insuredValue().scale() > 2))
            throw new DeviceApiException(HttpStatus.BAD_REQUEST, "Insured value must be a positive amount with up to two decimal places");
        device.setInsurancePolicy(request.policyId() == null ? null : policies.findById(request.policyId())
                .orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "Insurance policy not found")));
        device.setInsuredValue(request.policyId() == null ? null : request.insuredValue());
        devices.saveAndFlush(device);
        return service.findById(id);
    }
    private DeviceResponse.PolicyResponse response(InsurancePolicy p) {
        return new DeviceResponse.PolicyResponse(p.getId(), p.getPolicyNumber(), p.getInsurerName(), p.getStartDate(), p.getEndDate());
    }
}
