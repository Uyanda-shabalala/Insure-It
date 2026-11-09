package com.insureit;

import com.insureit.errors.DeviceApiException;
import com.insureit.models.*;
import com.insureit.repositories.*;
import com.insureit.services.DeviceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DeviceServiceValidationTest {
    final DeviceRepo devices = mock(DeviceRepo.class);
    final BrandRepo brands = mock(BrandRepo.class);
    final DeviceTypeRepo types = mock(DeviceTypeRepo.class);
    final DeviceService service = new DeviceService(devices, types, brands);
    final UUID brandId = UUID.randomUUID(), typeId = UUID.randomUUID();

    @BeforeEach void references() {
        Brand brand = new Brand(); brand.setName("Brand");
        DeviceType type = new DeviceType(); type.setName("Laptop");
        lenient().when(brands.findById(brandId)).thenReturn(Optional.of(brand));
        lenient().when(types.findById(typeId)).thenReturn(Optional.of(type));
        lenient().when(devices.save(any(Device.class))).thenAnswer(call -> {
            Device device = call.getArgument(0); device.setId(UUID.randomUUID()); return device;
        });
    }

    @Test void missingRequiredFieldsFailBeforeRepositoryAccess() {
        DeviceApiException error = assertThrows(DeviceApiException.class,
                () -> service.registerdevice(new CreateDeviceRequest(" \t", null, null, null, null, null)));
        assertEquals(400, error.status().value());
        assertEquals(3, error.fields().size());
        verifyNoInteractions(devices, brands, types);
    }

    @Test void nullBodyAndMissingNameAreRejected() {
        assertEquals(400, assertThrows(DeviceApiException.class, () -> service.registerdevice(null)).status().value());
        assertTrue(assertThrows(DeviceApiException.class, () -> service.registerdevice(
                new CreateDeviceRequest(null, null, null, brandId, typeId, null))).fields().containsKey("name"));
    }

    @ParameterizedTest @NullAndEmptySource @ValueSource(strings = {" ", "\t\n"})
    void unknownSerialIsSavedAsNullWithoutDuplicateLookup(String serial) {
        DeviceResponse response = service.registerdevice(request(serial));
        assertNull(response.serialNumber());
        assertNotNull(response.id());
        verify(devices, never()).existsBySerialNumber(any());
        verify(devices).save(argThat(device -> device.getSerialNumber() == null));
    }

    @Test void knownSerialRetainsExactValueAndExistingDuplicateRule() {
        String serial = " AbC123 ";
        when(devices.existsBySerialNumber(serial)).thenReturn(true);
        assertEquals(409, assertThrows(DeviceApiException.class, () -> service.registerdevice(request(serial))).status().value());
        verify(devices, never()).save(any());
    }

    @Test void distinctKnownSerialIsSavedUnchanged() {
        assertEquals(" AbC123 ", service.registerdevice(request(" AbC123 ")).serialNumber());
        verify(devices).existsBySerialNumber(" AbC123 ");
    }

    @Test void unknownBrandAndTypeReturnNotFound() {
        when(brands.findById(brandId)).thenReturn(Optional.empty());
        assertEquals("Brand not found", assertThrows(DeviceApiException.class, () -> service.registerdevice(request(null))).getMessage());
        Brand brand = new Brand(); when(brands.findById(brandId)).thenReturn(Optional.of(brand));
        when(types.findById(typeId)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(DeviceApiException.class, () -> service.registerdevice(request(null))).status().value());
        verify(devices, never()).save(any());
    }

    @Test void missingDeviceReturnsNotFound() {
        assertEquals(404, assertThrows(DeviceApiException.class, () -> service.findById(UUID.randomUUID())).status().value());
    }

    private CreateDeviceRequest request(String serial) {
        return new CreateDeviceRequest("Laptop", serial, null, brandId, typeId, null);
    }
}
