package com.insureit.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.util.UUID;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "insurance_policies")
public class InsurancePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "policy_number", nullable = false, columnDefinition = "text")
    private String policyNumber;

    @Column(name = "insurer_name", nullable = false, columnDefinition = "text")
    private String insurerName;

    @Column(name = "start_date", nullable = false, columnDefinition = "date")
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false, columnDefinition = "date")
    private LocalDate endDate;

    @Column(name = "document_path", nullable = true, columnDefinition = "text")
    private String documentPath;
}
