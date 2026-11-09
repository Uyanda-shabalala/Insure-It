import { z } from "zod";

/** A reference record (brand or device type) as returned by the backend. */
export interface NamedRef {
  id: string;
  name: string;
}

export interface InsurancePolicy {
  id: string;
  policyNumber: string;
  insurerName: string;
  startDate: string | null;
  endDate: string | null;
}

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  /** The backend returns display names, not nested objects. */
  brandName: string;
  deviceTypeName: string;
  model: string;
  location: string;
  /** Raw lifecycle status exactly as stored by the backend (see normalizeStatus in lib/format.ts). */
  status: string;
  /** Optional: a device can exist without any insurance. */
  insurancePolicy: InsurancePolicy | null;
  insuredValue: number | null;
  purchaseDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
}

export interface Assignment {
  id: string;
  employee: Employee;
  assignedAt: string | null;
}

/** Registration form: only these fields are collected. Insurance and assignment are optional later steps. */
export const deviceFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a device name").max(120),
  serialNumber: z.string().trim().max(120),
  brandId: z.string().min(1, "Select a brand"),
  deviceTypeId: z.string().min(1, "Select a device type"),
  model: z.string().trim().max(120),
  location: z.string().trim().max(120),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;

/** Hand-off from the capture screen: the serial number read from the photo. */
export interface DeviceDraft {
  serial: string;
  /** Sent by the capture screen for OCR only; it is not saved (the backend has no image upload endpoint). */
  photo?: string | null;
}
