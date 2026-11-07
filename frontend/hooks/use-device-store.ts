"use client";

import { useCallback, useEffect, useState } from "react";
import type { Device, DeviceFormValues } from "@/lib/domain/device";
import { listDevices, registerDevice } from "@/lib/services/device-service";
import { errorMessage } from "@/lib/services/api-client";

export function useDeviceStore() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void listDevices(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) {
          setDevices(records);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRevision((value) => value + 1);
  }, []);

  const addDevice = useCallback(
    async (values: DeviceFormValues) => {
      const saved = await registerDevice(values);
      // Only confirmed server data is ever placed in inventory state.
      setDevices((current) => [
        saved,
        ...(current ?? []).filter((item) => item.id !== saved.id),
      ]);
      refresh();
      return saved;
    },
    [refresh],
  );

  return { devices, isLoading, error, refresh, addDevice };
}
