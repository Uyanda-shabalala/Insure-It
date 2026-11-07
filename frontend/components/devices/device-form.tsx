"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ImageIcon, Loader2, RefreshCw, ScanLine } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  deviceFormSchema,
  type DeviceDraft,
  type DeviceFormValues,
  type LookupOption,
} from "@/lib/domain/device";
import { errorMessage } from "@/lib/services/api-client";
import { listBrands, listDeviceTypes } from "@/lib/services/device-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface DeviceFormProps {
  draft?: DeviceDraft;
  onSave: (values: DeviceFormValues) => Promise<void>;
  onCancel: () => void;
}

export function DeviceForm({ draft, onSave, onCancel }: DeviceFormProps) {
  const [references, setReferences] = useState<{
    brands: LookupOption[];
    types: LookupOption[];
    errors: string[];
  }>({ brands: [], types: [], errors: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [revision, setRevision] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: "",
      serialNumber: draft?.serial ?? "",
      brandId: "",
      deviceTypeId: "",
      model: "",
      location: "",
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([
      listBrands(controller.signal),
      listDeviceTypes(controller.signal),
    ]).then(([brands, types]) => {
      if (controller.signal.aborted) return;
      setReferences({
        brands: brands.status === "fulfilled" ? brands.value : [],
        types: types.status === "fulfilled" ? types.value : [],
        errors: [
          ...(brands.status === "rejected"
            ? [`Brand list unavailable: ${errorMessage(brands.reason)}`]
            : brands.value.length
              ? []
              : ["The backend has no brands to select."]),
          ...(types.status === "rejected"
            ? [`Device type list unavailable: ${errorMessage(types.reason)}`]
            : types.value.length
              ? []
              : ["The backend has no device types to select."]),
        ],
      });
      setLoadingOptions(false);
    });
    return () => controller.abort();
  }, [revision]);

  const ready =
    !loadingOptions &&
    references.brands.length > 0 &&
    references.types.length > 0;
  const fieldError = (field: keyof DeviceFormValues) =>
    errors[field]?.message ? (
      <p
        id={`${field}-error`}
        className="mt-1 text-xs font-semibold text-[var(--danger)]"
      >
        {errors[field]?.message}
      </p>
    ) : null;

  async function submit(values: DeviceFormValues) {
    if (submitting.current) return;
    if (
      !ready ||
      !references.brands.some((item) => item.id === values.brandId) ||
      !references.types.some((item) => item.id === values.deviceTypeId)
    ) {
      setSubmitError(
        "Select a brand and device type from the current backend lists before registering.",
      );
      return;
    }
    submitting.current = true;
    setSubmitError(null);
    try {
      await onSave(values);
    } catch (caught) {
      setSubmitError(errorMessage(caught));
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
      noValidate
      aria-busy={isSubmitting}
    >
      <header>
        <p className="text-sm font-bold text-[var(--primary)]">New IT asset</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Register Device
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Review the serial number and complete the device information.
          Registration starts the device as available.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Serial review</CardTitle>
                <CardDescription>
                  OCR helps fill the serial; registration always requires your
                  confirmation.
                </CardDescription>
              </div>
              <ScanLine className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent>
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border bg-[var(--surface-muted)]">
                {draft?.photo ? (
                  <Image
                    src={draft.photo}
                    alt="Captured device label"
                    width={1280}
                    height={960}
                    unoptimized
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center text-sm text-[var(--muted)]">
                    <ImageIcon className="mx-auto mb-3" size={34} />
                    Manual registration is available without a photo.
                  </div>
                )}
              </div>
              {draft?.photo ? (
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  This photo is a preview for serial review. It will not be
                  saved with the device.
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-bold">Optional policy tracking</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Insurance is not required to register an IT asset. Any linked
              policy returned by the backend appears in Device Details.
            </p>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Device Information</CardTitle>
              <CardDescription>
                Fields marked * are required. Brand and type options come from
                the backend.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingOptions ? (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-[var(--muted)]"
              >
                <Loader2 size={16} className="animate-spin" /> Loading brands
                and device types...
              </p>
            ) : null}
            {references.errors.length ? (
              <div
                role="alert"
                className="space-y-2 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]"
              >
                {references.errors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
                <p>
                  Registration needs valid backend options. Your entered fields
                  are kept while you retry.
                </p>
                <Button
                  variant="secondary"
                  disabled={loadingOptions || isSubmitting}
                  onClick={() => {
                    setLoadingOptions(true);
                    setRevision((value) => value + 1);
                  }}
                >
                  <RefreshCw size={15} /> Retry options
                </Button>
              </div>
            ) : null}
            <fieldset
              className="grid gap-5 sm:grid-cols-2"
              disabled={isSubmitting}
            >
              <div className="sm:col-span-2">
                <Label htmlFor="name">Device name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {fieldError("name")}
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial number</Label>
                <Input
                  id="serialNumber"
                  {...register("serialNumber")}
                  aria-invalid={Boolean(errors.serialNumber)}
                />
                {fieldError("serialNumber")}
              </div>
              <div>
                <Label htmlFor="brandId">Brand *</Label>
                <Select
                  id="brandId"
                  {...register("brandId")}
                  disabled={
                    loadingOptions || !references.brands.length || isSubmitting
                  }
                  aria-invalid={Boolean(errors.brandId)}
                >
                  <option value="">Select brand</option>
                  {references.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
                {fieldError("brandId")}
              </div>
              <div>
                <Label htmlFor="deviceTypeId">Device type *</Label>
                <Select
                  id="deviceTypeId"
                  {...register("deviceTypeId")}
                  disabled={
                    loadingOptions || !references.types.length || isSubmitting
                  }
                  aria-invalid={Boolean(errors.deviceTypeId)}
                >
                  <option value="">Select device type</option>
                  {references.types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
                {fieldError("deviceTypeId")}
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...register("model")} />
                {fieldError("model")}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register("location")} />
                {fieldError("location")}
              </div>
            </fieldset>
            {submitError ? (
              <p
                role="alert"
                className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
              >
                {submitError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button
                variant="secondary"
                disabled={isSubmitting}
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!ready || isSubmitting}>
                {isSubmitting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Check size={17} />
                )}
                {isSubmitting ? "Registering..." : "Register Device"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
