import { z } from "zod";

export const deviceTypes = ["Laptop", "Desktop", "Tablet", "Smartphone", "Smartwatch", "TV", "Camera", "Other"] as const;
export const insurerOptions = ["Outsurance", "Hollard", "Discovery", "Santam", "King Price", "Momentum", "Other"] as const;

export type DeviceTypeOption = (typeof deviceTypes)[number];
export type InsurerOption = (typeof insurerOptions)[number];

export interface Claim {
  id: string;
  date: string;
  description: string;
  amount: number | null;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  serial: string;
  insurer: string;
  policyNumber: string;
  expiryDate: string;
  premium: number | null;
  sumInsured: number | null;
  photo: string | null;
  claims: Claim[];
  addedAt: number;
  updatedAt: number;
}

export const deviceFormSchema = z
  .object({
    type: z.enum(deviceTypes, { error: "Select a device type" }),
    customType: z.string().trim().max(80),
    name: z.string().trim().min(2, "Enter a device name").max(120),
    serial: z.string().trim().max(120),
    insurer: z.enum(insurerOptions, { error: "Select an insurer" }),
    customInsurer: z.string().trim().max(120),
    policyNumber: z.string().trim().max(120),
    expiryDate: z.string().min(1, "Select a cover expiry date"),
    premium: z.string(),
    sumInsured: z.string(),
    photo: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "Other" && !value.customType) {
      ctx.addIssue({ code: "custom", path: ["customType"], message: "Enter the device type" });
    }
    if (value.insurer === "Other" && !value.customInsurer) {
      ctx.addIssue({ code: "custom", path: ["customInsurer"], message: "Enter the insurer name" });
    }
    for (const field of ["premium", "sumInsured"] as const) {
      if (value[field] !== "" && (!Number.isFinite(Number(value[field])) || Number(value[field]) < 0)) {
        ctx.addIssue({ code: "custom", path: [field], message: "Enter a valid positive amount" });
      }
    }
  });

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;

export const claimFormSchema = z.object({
  date: z.string().min(1, "Select a claim date"),
  description: z.string().trim().min(3, "Describe what happened").max(240),
  amount: z.string().refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0), {
    message: "Enter a valid positive amount",
  }),
});

export type ClaimFormValues = z.infer<typeof claimFormSchema>;

export interface DeviceDraft {
  serial: string;
  photo: string | null;
}

export type DeviceStatus = "active" | "expiring" | "expired";
