"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, ImageIcon, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  deviceFormSchema,
  deviceTypes,
  insurerOptions,
  type Device,
  type DeviceDraft,
  type DeviceFormValues,
} from "@/lib/domain/device";
import { imageFileToDataUrl } from "@/lib/services/image-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function defaultValues(device?: Device, draft?: DeviceDraft): DeviceFormValues {
  const typeKnown = device ? deviceTypes.includes(device.type as (typeof deviceTypes)[number]) : false;
  const insurerKnown = device ? insurerOptions.includes(device.insurer as (typeof insurerOptions)[number]) : false;
  return {
    type: device ? (typeKnown ? (device.type as DeviceFormValues["type"]) : "Other") : "Laptop",
    customType: device && !typeKnown ? device.type : "",
    name: device?.name ?? "",
    serial: device?.serial ?? draft?.serial ?? "",
    insurer: device ? (insurerKnown ? (device.insurer as DeviceFormValues["insurer"]) : "Other") : "Outsurance",
    customInsurer: device && !insurerKnown ? device.insurer : "",
    policyNumber: device?.policyNumber ?? "",
    expiryDate: device?.expiryDate ?? "",
    premium: device?.premium?.toString() ?? "",
    sumInsured: device?.sumInsured?.toString() ?? "",
    photo: device?.photo ?? draft?.photo ?? null,
  };
}

interface DeviceFormProps {
  device?: Device;
  draft?: DeviceDraft;
  onSave: (values: DeviceFormValues) => void;
  onCancel: () => void;
}

export function DeviceForm({ device, draft, onSave, onCancel }: DeviceFormProps) {
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: defaultValues(device, draft),
  });

  const type = watch("type");
  const insurer = watch("insurer");
  const photo = watch("photo");

  async function handlePhoto(file?: File) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setValue("photo", await imageFileToDataUrl(file), { shouldDirty: true });
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : "The image could not be processed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const fieldError = (name: keyof DeviceFormValues) =>
    errors[name]?.message ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{errors[name]?.message}</p> : null;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSave)} noValidate>
      <header>
        <p className="text-sm font-bold text-[var(--primary)]">{device ? "Record maintenance" : "New insured asset"}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{device ? "Edit device details" : "Complete device details"}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Capture the evidence needed to identify the device and validate its insurance cover.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Device evidence</CardTitle>
                <CardDescription>Optional image used to support identification.</CardDescription>
              </div>
              <Camera className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent>
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border bg-[var(--surface-muted)]">
                {photo ? <img src={photo} alt="Device evidence" className="size-full object-cover" /> : <ImageIcon className="text-[var(--muted)]" size={34} />}
              </div>
              {photoError ? <p className="mt-2 text-xs font-semibold text-[var(--danger)]">{photoError}</p> : null}
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
                  {photoBusy ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                  {photo ? "Replace image" : "Add image"}
                </Button>
                {photo ? <Button variant="ghost" onClick={() => setValue("photo", null, { shouldDirty: true })}>Remove</Button> : null}
              </div>
              <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
            </CardContent>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"><ShieldCheck size={18} /></div>
              <div>
                <p className="text-sm font-bold">Validation built in</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Required fields, custom providers, and numeric cover values are validated before the record is saved.</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Insurance record</CardTitle>
              <CardDescription>Fields marked required must be completed.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="type">Device type *</Label>
                <Select id="type" {...register("type")} aria-invalid={Boolean(errors.type)}>
                  {deviceTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
                {fieldError("type")}
              </div>
              {type === "Other" ? (
                <div>
                  <Label htmlFor="customType">Custom type *</Label>
                  <Input id="customType" {...register("customType")} aria-invalid={Boolean(errors.customType)} />
                  {fieldError("customType")}
                </div>
              ) : (
                <div>
                  <Label htmlFor="name">Device name *</Label>
                  <Input id="name" placeholder='e.g. MacBook Pro 14"' {...register("name")} aria-invalid={Boolean(errors.name)} />
                  {fieldError("name")}
                </div>
              )}
            </div>

            {type === "Other" ? (
              <div>
                <Label htmlFor="name">Device name *</Label>
                <Input id="name" placeholder="e.g. Studio workstation" {...register("name")} aria-invalid={Boolean(errors.name)} />
                {fieldError("name")}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="serial">Serial number</Label>
                <Input id="serial" placeholder="Serial or asset identifier" {...register("serial")} />
              </div>
              <div>
                <Label htmlFor="policyNumber">Policy number</Label>
                <Input id="policyNumber" placeholder="Provider policy reference" {...register("policyNumber")} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="insurer">Insurance provider *</Label>
                <Select id="insurer" {...register("insurer")} aria-invalid={Boolean(errors.insurer)}>
                  {insurerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
                {fieldError("insurer")}
              </div>
              {insurer === "Other" ? (
                <div>
                  <Label htmlFor="customInsurer">Provider name *</Label>
                  <Input id="customInsurer" {...register("customInsurer")} aria-invalid={Boolean(errors.customInsurer)} />
                  {fieldError("customInsurer")}
                </div>
              ) : (
                <div>
                  <Label htmlFor="expiryDate">Cover expiry date *</Label>
                  <Input id="expiryDate" type="date" {...register("expiryDate")} aria-invalid={Boolean(errors.expiryDate)} />
                  {fieldError("expiryDate")}
                </div>
              )}
            </div>

            {insurer === "Other" ? (
              <div>
                <Label htmlFor="expiryDate">Cover expiry date *</Label>
                <Input id="expiryDate" type="date" {...register("expiryDate")} aria-invalid={Boolean(errors.expiryDate)} />
                {fieldError("expiryDate")}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="premium">Monthly premium (R)</Label>
                <Input id="premium" inputMode="decimal" type="number" min="0" step="0.01" placeholder="0.00" {...register("premium")} aria-invalid={Boolean(errors.premium)} />
                {fieldError("premium")}
              </div>
              <div>
                <Label htmlFor="sumInsured">Sum insured (R)</Label>
                <Input id="sumInsured" inputMode="decimal" type="number" min="0" step="1" placeholder="0" {...register("sumInsured")} aria-invalid={Boolean(errors.sumInsured)} />
                {fieldError("sumInsured")}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || photoBusy}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                {device ? "Save changes" : "Save device"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
