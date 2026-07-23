"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, FileText, Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { claimFormSchema, type ClaimFormValues, type Device } from "@/lib/domain/device";
import { formatCurrency, formatDate, getDeviceStatus } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeviceIcon } from "@/components/shared/device-icon";
import { StatusBadge } from "@/components/shared/status-badge";

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onAddClaim: (values: ClaimFormValues) => void;
  onRemoveClaim: (claimId: string) => void;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-bold">{value}</dd>
    </div>
  );
}

export function DeviceDetail({ device, onBack, onEdit, onRemove, onAddClaim, onRemoveClaim }: DeviceDetailProps) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: { date: "", description: "", amount: "" },
  });

  function submitClaim(values: ClaimFormValues) {
    onAddClaim(values);
    reset();
    setClaimOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" className="-ml-3 mb-2" onClick={onBack}><ArrowLeft size={16} /> Back to inventory</Button>
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              {device.photo ? <img src={device.photo} alt="" className="size-full object-cover" /> : <DeviceIcon type={device.type} size={28} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">{device.name}</h1>
                <StatusBadge status={getDeviceStatus(device.expiryDate)} />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{device.type} · {device.serial || "No serial recorded"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEdit}><Pencil size={16} /> Edit</Button>
          <Button variant="outlineDanger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Remove</Button>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Policy summary</CardTitle>
                <CardDescription>Primary cover and identification fields.</CardDescription>
              </div>
              <Shield className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent>
              <dl>
                <DetailItem label="Insurance provider" value={device.insurer} />
                <DetailItem label="Policy number" value={device.policyNumber || "—"} />
                <DetailItem label="Monthly premium" value={formatCurrency(device.premium)} />
                <DetailItem label="Sum insured" value={formatCurrency(device.sumInsured)} />
                <DetailItem label="Cover expiry" value={formatDate(device.expiryDate)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Evidence</CardTitle>
                <CardDescription>Image stored with this browser-side record.</CardDescription>
              </div>
              <FileText className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent>
              {device.photo ? (
                <img src={device.photo} alt={`Evidence for ${device.name}`} className="aspect-[4/3] w-full rounded-2xl border object-cover" />
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed bg-[var(--surface-muted)] text-sm text-[var(--muted)]">No evidence image attached</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Claims history</CardTitle>
              <CardDescription>{device.claims.length} claim{device.claims.length === 1 ? "" : "s"} recorded for this device.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setClaimOpen(true)}><Plus size={15} /> Add claim</Button>
          </CardHeader>
          <CardContent>
            {device.claims.length ? (
              <div className="space-y-3">
                {device.claims.map((claim) => (
                  <article key={claim.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{claim.description}</h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]"><CalendarDays size={13} /> {formatDate(claim.date)}</p>
                      </div>
                      <Button aria-label={`Remove claim ${claim.description}`} variant="ghost" size="icon" onClick={() => onRemoveClaim(claim.id)}><X size={16} /></Button>
                    </div>
                    <p className="mt-4 text-sm font-extrabold text-[var(--primary)]">{formatCurrency(claim.amount)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-[var(--surface-muted)] p-8 text-center">
                <div>
                  <FileText className="mx-auto text-[var(--muted)]" size={28} />
                  <h3 className="mt-3 font-bold">No claims recorded</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Add a claim to keep the full insurance history with this device.</p>
                  <Button className="mt-5" onClick={() => setClaimOpen(true)}><Plus size={16} /> Add first claim</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen} title="Add claim" description={`Record a claim against ${device.name}.`}>
        <form className="space-y-4 p-5" onSubmit={handleSubmit(submitClaim)}>
          <div>
            <Label htmlFor="claim-date">Claim date *</Label>
            <Input id="claim-date" type="date" {...register("date")} />
            {errors.date ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{errors.date.message}</p> : null}
          </div>
          <div>
            <Label htmlFor="claim-description">Description *</Label>
            <Textarea id="claim-description" placeholder="Describe the loss, damage, or repair" {...register("description")} />
            {errors.description ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{errors.description.message}</p> : null}
          </div>
          <div>
            <Label htmlFor="claim-amount">Payout or repair amount (R)</Label>
            <Input id="claim-amount" type="number" min="0" step="0.01" placeholder="0.00" {...register("amount")} />
            {errors.amount ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{errors.amount.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="secondary" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button type="submit">Save claim</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Remove device" description="This action cannot be undone.">
        <div className="p-5">
          <p className="text-sm leading-6 text-[var(--muted)]">Remove <strong className="text-[var(--foreground)]">{device.name}</strong>, its policy details, evidence image, and {device.claims.length} claim record{device.claims.length === 1 ? "" : "s"}?</p>
          <div className="mt-5 flex justify-end gap-2 border-t pt-4">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onRemove}><Trash2 size={16} /> Remove device</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
