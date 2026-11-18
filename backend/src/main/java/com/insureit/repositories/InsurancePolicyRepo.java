package com.insureit.repositories;
import com.insureit.models.InsurancePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface InsurancePolicyRepo extends JpaRepository<InsurancePolicy, UUID> {
    boolean existsByInsurerNameIgnoreCaseAndPolicyNumberIgnoreCase(String insurerName, String policyNumber);
}
