"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createDevice, listDevices } from "@/lib/api/devices";
import type { Device, DeviceFormValues } from "@/lib/domain/device";

/** Device data comes from the backend only. Nothing is cached in localStorage. */
export function useDeviceStore() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDevices(await listDevices());
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Devices could not be loaded.");
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listDevices()
      .then((list) => {
        if (!active) return;
        setDevices(list);
        setLoadError(null);
      })
      .catch((caught) => {
        if (active) setLoadError(caught instanceof Error ? caught.message : "Devices could not be loaded.");
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Throws on failure so the form can keep the user's input and show the message. */
  const addDevice = useCallback(
    async (values: DeviceFormValues) => {
      const saved = await createDevice(values);
      setDevices((current) => [...current.filter((device) => device.id !== saved.id), saved]);
      await refresh();
      return saved.id;
    },
    [refresh],
  );

  const byId = useMemo(() => new Map(devices.map((device) => [device.id, device])), [devices]);

  return { devices, byId, isReady, loadError, refresh, addDevice };
}
