package com.insureit.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.util.UUID;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "devices")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})

public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "serial_number", nullable = true, columnDefinition = "text")
    private String serialNumber;

    @Column(name = "name", nullable = false, columnDefinition = "text")
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "brand_id", nullable = false)
    private Brand brand;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_type_id", nullable = false)
    private DeviceType deviceType;

    @Column(name = "model", nullable = true, columnDefinition = "text")
    private String model;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "insurance_policy_id", nullable = true)
    private InsurancePolicy insurancePolicy;

    @Column(name = "purchase_date", nullable = true, columnDefinition = "date")
    private LocalDate purchaseDate;

    @Column(name = "insured_value", nullable = true, columnDefinition = "numeric")
    private BigDecimal insuredValue;

    @Column(name = "photo_path", nullable = true, columnDefinition = "text")
    private String photoPath;

    @Column(name = "status", nullable = false, columnDefinition = "text")
    private String status;

    @Column(name = "location", nullable = true, columnDefinition = "text")
    private String location;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamp with time zone")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "timestamp with time zone")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
