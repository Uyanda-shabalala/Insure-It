package com.insureit.repositories;


import com.insureit.models.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
@Repository
public interface DeviceRepo extends JpaRepository<Device, UUID> {}
