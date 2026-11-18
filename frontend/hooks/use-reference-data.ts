"use client";

import { useCallback, useEffect, useState } from "react";
import { listBrands, listDeviceTypes } from "@/lib/api/devices";
import type { NamedRef } from "@/lib/domain/device";

/** Brands and device types for the registration dropdowns, loaded from the backend (real ids only). */
export function useReferenceData() {
  const [brands, setBrands] = useState<NamedRef[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<NamedRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [brandResult, typeResult] = await Promise.allSettled([listBrands(), listDeviceTypes()]);
    if (brandResult.status === "fulfilled") setBrands(brandResult.value);
    if (typeResult.status === "fulfilled") setDeviceTypes(typeResult.value);
    const failure = [brandResult, typeResult].find((result) => result.status === "rejected");
    if (failure && failure.status === "rejected") {
      setError(failure.reason instanceof Error ? failure.reason.message : "Brands and device types could not be loaded.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { brands, deviceTypes, loading, error, reload: load };
}
