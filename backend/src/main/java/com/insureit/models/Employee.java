package com.insureit.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "employee_number", nullable = false, columnDefinition = "text")
    private String employeeNumber;

    @Column(name = "full_name", nullable = false, columnDefinition = "text")
    private String fullName;

    @Column(name = "email", nullable = true, columnDefinition = "text")
    private String email;

    @Column(name = "department", nullable = true, columnDefinition = "text")
    private String department;
}
