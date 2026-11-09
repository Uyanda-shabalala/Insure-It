package com.insureit;

import com.insureit.models.*;
import com.insureit.repositories.EmployeeRepo;
import com.insureit.services.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmployeeServiceTest {
    private final EmployeeRepo repo = mock(EmployeeRepo.class);
    private final EmployeeService service = new EmployeeService(repo);

    @Test void requiredFieldsAreValidatedBeforeSaving() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.createEmployee(null)).getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> service.createEmployee(
                new EmployeeRequest(" ", "Name", null, null)));
        assertThrows(ResponseStatusException.class, () -> service.createEmployee(
                new EmployeeRequest("E1", null, null, null)));
        verifyNoInteractions(repo);
    }

    @Test void creationMapsFieldsAndNormalizesOptionalBlanks() {
        UUID id = UUID.randomUUID();
        when(repo.save(any(Employee.class))).thenAnswer(call -> {
            Employee employee = call.getArgument(0);
            employee.setId(id);
            return employee;
        });
        EmployeeResponse response = service.createEmployee(
                new EmployeeRequest(" E1 ", " Jane Doe ", " ", " IT "));
        assertEquals(new EmployeeResponse(id, "E1", "Jane Doe", null, "IT"), response);
    }

    @Test void missingEmployeeReturns404ForReadUpdateAndDelete() {
        UUID id = UUID.randomUUID();
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.findById(id)).getStatusCode().value());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.updateEmployee(id, new EmployeeRequest("E1", "Jane", null, null)))
                .getStatusCode().value());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.deleteById(id)).getStatusCode().value());
        verify(repo, never()).save(any());
        verify(repo, never()).delete(any(Employee.class));
    }

    @Test void updatePreservesIdAndReplacesOptionalDetails() {
        UUID id = UUID.randomUUID();
        Employee employee = new Employee();
        employee.setId(id);
        employee.setEmail("old@example.com");
        when(repo.findById(id)).thenReturn(Optional.of(employee));
        when(repo.save(employee)).thenReturn(employee);
        assertEquals(new EmployeeResponse(id, "E2", "Jane Doe", null, "HR"),
                service.updateEmployee(id, new EmployeeRequest("E2", "Jane Doe", null, "HR")));
        service.deleteById(id);
        verify(repo).delete(employee);
    }
}
