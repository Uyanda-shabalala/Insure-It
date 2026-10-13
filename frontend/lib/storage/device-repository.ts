import type { Device } from "@/lib/domain/device";
import { seedDevices } from "@/lib/data/seed";

const STORAGE_KEY = "insure-it:devices:v2";
const SCHEMA_VERSION = 2;

interface PersistedStore {
  version: number;
  devices: Device[];
}

export interface DeviceRepository {
  read(): Promise<Device[]>;
  write(devices: Device[]): Promise<void>;
  reset(): Promise<Device[]>;
}

function cloneSeed() {
  return structuredClone(seedDevices);
}

class BrowserDeviceRepository implements DeviceRepository {
  async read() {
    if (typeof window === "undefined") return cloneSeed();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneSeed();
      const payload = JSON.parse(raw) as PersistedStore;
      if (payload.version !== SCHEMA_VERSION || !Array.isArray(payload.devices)) return cloneSeed();
      return payload.devices;
    } catch {
      return cloneSeed();
    }
  }

  async write(devices: Device[]) {
    if (typeof window === "undefined") return;
    const payload: PersistedStore = { version: SCHEMA_VERSION, devices };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  async reset() {
    const devices = cloneSeed();
    await this.write(devices);
    return devices;
  }
}

export const deviceRepository: DeviceRepository = new BrowserDeviceRepository();
