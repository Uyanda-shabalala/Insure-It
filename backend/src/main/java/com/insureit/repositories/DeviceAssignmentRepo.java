package com.insureit.repositories;

import com.insureit.models.DeviceAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface DeviceAssignmentRepo extends JpaRepository<DeviceAssignment, UUID> {
    Optional<DeviceAssignment> findFirstByDeviceIdAndReturnedAtIsNullOrderByAssignedAtDesc(UUID deviceId);
}
