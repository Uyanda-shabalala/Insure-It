package com.insureit.repositories;

import com.insureit.models.DeviceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.UUID;
@Repository
public interface DeviceTypeRepo extends JpaRepository<DeviceType, UUID> {
}
