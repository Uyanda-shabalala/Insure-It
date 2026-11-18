package com.insureit.repositories;

import com.insureit.models.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface EmployeeRepo extends JpaRepository<Employee, UUID> {}
