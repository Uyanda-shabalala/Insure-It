package com.insureit.repositories;


import com.insureit.models.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
@Repository
public interface DeviceRepo extends JpaRepository<Device, UUID> {

    boolean existsBySerialNumber(String serialNumber);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select d from Device d where d.id = :id")
    java.util.Optional<Device> lockById(@org.springframework.data.repository.query.Param("id") UUID id);

}
