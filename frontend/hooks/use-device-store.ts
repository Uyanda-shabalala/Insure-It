"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Claim, ClaimFormValues, Device, DeviceFormValues } from "@/lib/domain/device";
import { deviceRepository } from "@/lib/storage/device-repository";

function toNullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

function resolveType(values: DeviceFormValues) {
  return values.type === "Other" ? values.customType.trim() || "Other" : values.type;
}

function resolveInsurer(values: DeviceFormValues) {
  return values.insurer === "Other" ? values.customInsurer.trim() || "Other" : values.insurer;
}

export function useDeviceStore() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void deviceRepository.read().then((stored) => {
      if (!active) return;
      setDevices(stored);
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void deviceRepository
      .write(devices)
      .then(() => setPersistenceError(null))
      .catch(() => setPersistenceError("Changes are visible now but could not be saved in this browser."));
  }, [devices, isReady]);

  const addDevice = useCallback((values: DeviceFormValues) => {
    const now = Date.now();
    const device: Device = {
      id: crypto.randomUUID(),
      name: values.name.trim(),
      type: resolveType(values),
      serial: values.serial.trim(),
      insurer: resolveInsurer(values),
      policyNumber: values.policyNumber.trim(),
      expiryDate: values.expiryDate,
      premium: toNullableNumber(values.premium),
      sumInsured: toNullableNumber(values.sumInsured),
      photo: values.photo,
      claims: [],
      addedAt: now,
      updatedAt: now,
    };
    setDevices((current) => [device, ...current]);
    return device.id;
  }, []);

  const updateDevice = useCallback((id: string, values: DeviceFormValues) => {
    setDevices((current) =>
      current.map((device) =>
        device.id === id
          ? {
              ...device,
              name: values.name.trim(),
              type: resolveType(values),
              serial: values.serial.trim(),
              insurer: resolveInsurer(values),
              policyNumber: values.policyNumber.trim(),
              expiryDate: values.expiryDate,
              premium: toNullableNumber(values.premium),
              sumInsured: toNullableNumber(values.sumInsured),
              photo: values.photo,
              updatedAt: Date.now(),
            }
          : device,
      ),
    );
  }, []);

  const removeDevice = useCallback((id: string) => {
    setDevices((current) => current.filter((device) => device.id !== id));
  }, []);

  const addClaim = useCallback((deviceId: string, values: ClaimFormValues) => {
    const claim: Claim = {
      id: crypto.randomUUID(),
      date: values.date,
      description: values.description.trim(),
      amount: toNullableNumber(values.amount),
    };
    setDevices((current) =>
      current.map((device) =>
        device.id === deviceId
          ? { ...device, claims: [claim, ...device.claims], updatedAt: Date.now() }
          : device,
      ),
    );
  }, []);

  const removeClaim = useCallback((deviceId: string, claimId: string) => {
    setDevices((current) =>
      current.map((device) =>
        device.id === deviceId
          ? { ...device, claims: device.claims.filter((claim) => claim.id !== claimId), updatedAt: Date.now() }
          : device,
      ),
    );
  }, []);

  const resetDemoData = useCallback(async () => {
    const reset = await deviceRepository.reset();
    setDevices(reset);
  }, []);

  const byId = useMemo(() => new Map(devices.map((device) => [device.id, device])), [devices]);

  return {
    devices,
    byId,
    isReady,
    persistenceError,
    addDevice,
    updateDevice,
    removeDevice,
    addClaim,
    removeClaim,
    resetDemoData,
  };
}
