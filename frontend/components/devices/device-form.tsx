"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Info, Loader2, RefreshCw, ScanLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { deviceFormSchema, type DeviceDraft, type DeviceFormValues } from "@/lib/domain/device";
import { useReferenceData } from "@/hooks/use-reference-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface DeviceFormProps {
  draft?: DeviceDraft;
  /** Must throw on failure so the entered details are kept and the message is shown. */
  onSave: (values: DeviceFormValues) => Promise<void>;
  onCancel: () => void;
}

export function DeviceForm({ draft, onSave, onCancel }: DeviceFormProps) {
  const reference = useReferenceData();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: { name: "", serialNumber: draft?.serial ?? "", brandId: "", deviceTypeId: "", model: "", location: "" },
  });

  async function submit(values: DeviceFormValues) {
    setSubmitError(null);
    try {
      await onSave(values);
    } catch (caught) {
      // Not retried automatically: a timed-out registration may already have been saved.
      setSubmitError(caught instanceof Error ? caught.message : "The device could not be saved.");
    }
  }

  const fieldError = (name: keyof DeviceFormValues) =>
    errors[name]?.message ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{errors[name]?.message}</p> : null;

  const dropdownsReady = !reference.loading && !reference.error && reference.brands.length > 0 && reference.deviceTypes.length > 0;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submit)} noValidate>
      <header>
        <p className="text-sm font-bold text-[var(--primary)]">New device</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Register a device</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Enter the details that identify the device. Insurance and assignment can be added later.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          {draft ? (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><ScanLine size={18} /></div>
                <div>
                  <p className="text-sm font-bold">Serial number read from your photo</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Check it against the device label and correct it if needed before saving.</p>
                </div>
              </div>
            </Card>
          ) : null}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"><Info size={18} /></div>
              <div>
                <p className="text-sm font-bold">Nothing else is required</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">A device can be registered without insurance and without an assigned employee. New devices start as available.</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Device details</CardTitle>
              <CardDescription>Fields marked * are required.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {reference.error ? (
              <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between">
                <span>{reference.error} The brand and device type lists are needed to register a device.</span>
                <Button variant="secondary" size="sm" onClick={() => void reference.reload()}><RefreshCw size={14} /> Try again</Button>
              </div>
            ) : null}

            <div>
              <Label htmlFor="name">Device name *</Label>
              <Input id="name" placeholder='e.g. Finance laptop 04' {...register("name")} aria-invalid={Boolean(errors.name)} />
              {fieldError("name")}
            </div>

            <div>
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input id="serialNumber" placeholder="Serial or asset identifier" {...register("serialNumber")} aria-invalid={Boolean(errors.serialNumber)} />
              {fieldError("serialNumber")}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="brandId">Brand *</Label>
                <Select id="brandId" {...register("brandId")} disabled={reference.loading || !reference.brands.length} aria-invalid={Boolean(errors.brandId)}>
                  <option value="">{reference.loading ? "Loading brands…" : reference.brands.length ? "Select a brand" : "No brands available"}</option>
                  {reference.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </Select>
                {fieldError("brandId")}
              </div>
              <div>
                <Label htmlFor="deviceTypeId">Device type *</Label>
                <Select id="deviceTypeId" {...register("deviceTypeId")} disabled={reference.loading || !reference.deviceTypes.length} aria-invalid={Boolean(errors.deviceTypeId)}>
                  <option value="">{reference.loading ? "Loading types…" : reference.deviceTypes.length ? "Select a device type" : "No device types available"}</option>
                  {reference.deviceTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </Select>
                {fieldError("deviceTypeId")}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="model">Model</Label>
                <Input id="model" placeholder="e.g. Latitude 5420" {...register("model")} aria-invalid={Boolean(errors.model)} />
                {fieldError("model")}
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="e.g. IT department" {...register("location")} aria-invalid={Boolean(errors.location)} />
                {fieldError("location")}
              </div>
            </div>

            {submitError ? (
              <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{submitError}</p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !dropdownsReady}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Register device
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
