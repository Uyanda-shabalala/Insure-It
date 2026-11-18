package com.insureit.services;

import com.insureit.models.Employee;
import com.insureit.models.EmployeeRequest;
import com.insureit.models.EmployeeResponse;
import com.insureit.repositories.EmployeeRepo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EmployeeService {
    private final EmployeeRepo employeeRepo;

    public EmployeeService(EmployeeRepo employeeRepo) {
        this.employeeRepo = employeeRepo;
    }

    public List<EmployeeResponse> getAllEmployees() {
        return employeeRepo.findAll().stream().map(this::toResponse).toList();
    }

    public EmployeeResponse findById(UUID id) {
        return toResponse(requireEmployee(id));
    }

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        validate(request);
        Employee employee = new Employee();
        apply(employee, request);
        return toResponse(employeeRepo.save(employee));
    }

    @Transactional
    public EmployeeResponse updateEmployee(UUID id, EmployeeRequest request) {
        validate(request);
        Employee employee = requireEmployee(id);
        apply(employee, request);
        return toResponse(employeeRepo.save(employee));
    }

    @Transactional
    public void deleteById(UUID id) {
        employeeRepo.delete(requireEmployee(id));
    }

    private Employee requireEmployee(UUID id) {
        return employeeRepo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
    }

    private void validate(EmployeeRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee request body is required");
        }
        if (request.employeeNumber() == null || request.employeeNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee number is required");
        }
        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required");
        }
    }

    private void apply(Employee employee, EmployeeRequest request) {
        employee.setEmployeeNumber(TextInput.text(request.employeeNumber(), "employeeNumber", true, 80));
        employee.setFullName(TextInput.text(request.fullName(), "fullName", true, 120));
        employee.setEmail(optionalText(request.email()));
        employee.setDepartment(TextInput.text(request.department(), "department", false, 120));
        if (employee.getEmail() != null && (employee.getEmail().length() > 254 || !employee.getEmail().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(employee.getId(), employee.getEmployeeNumber(),
                employee.getFullName(), employee.getEmail(), employee.getDepartment());
    }
}
