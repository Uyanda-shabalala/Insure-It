"use client";

import { ArrowLeft, Cpu, Shield } from "lucide-react";
import type { Device } from "@/lib/domain/device";
import { formatCurrency, formatDate, getCoverStatus } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeviceIcon } from "@/components/shared/device-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { DeviceAssignment } from "@/components/devices/device-assignment";

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  onChanged: (message: string) => Promise<void>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-bold">{value || <span className="font-medium text-[var(--muted)]">Not recorded</span>}</dd>
    </div>
  );
}

export function DeviceDetail({ device, onBack, onChanged }: DeviceDetailProps) {
  const policy = device.insurancePolicy;
  const cover = policy ? getCoverStatus(policy.endDate) : null;

  return (
    <div className="space-y-6">
      <header>
        <Button variant="ghost" className="-ml-3 mb-2" onClick={onBack}><ArrowLeft size={16} /> Back to inventory</Button>
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <DeviceIcon type={device.deviceTypeName} size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">{device.name}</h1>
              <StatusBadge status={device.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{[device.deviceTypeName, device.serialNumber || "No serial recorded"].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Device details</CardTitle>
                <CardDescription>How this device is identified in the inventory.</CardDescription>
              </div>
              <Cpu className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent>
              <dl className="grid sm:grid-cols-2 sm:gap-x-8">
                <DetailItem label="Device name" value={device.name} />
                <DetailItem label="Serial number" value={device.serialNumber} />
                <DetailItem label="Brand" value={device.brandName} />
                <DetailItem label="Model" value={device.model} />
                <DetailItem label="Device type" value={device.deviceTypeName} />
                <DetailItem label="Location" value={device.location} />
                <DetailItem label="Registered" value={formatDate(device.createdAt)} />
                <DetailItem label="Last updated" value={formatDate(device.updatedAt)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Insurance</CardTitle>
                <CardDescription>Optional. Devices do not need a policy to be registered.</CardDescription>
              </div>
              <Shield className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent>
              {policy ? (
                <>
                  {cover ? <Badge className="mb-2" variant={cover === "active" ? "success" : cover === "expiring" ? "warning" : "danger"}>{cover === "active" ? "Cover active" : cover === "expiring" ? "Expiring soon" : "Cover expired"}</Badge> : null}
                  <dl className="grid sm:grid-cols-2 sm:gap-x-8">
                    <DetailItem label="Insurer" value={policy.insurerName} />
                    <DetailItem label="Policy number" value={policy.policyNumber} />
                    <DetailItem label="Cover starts" value={formatDate(policy.startDate)} />
                    <DetailItem label="Cover ends" value={formatDate(policy.endDate)} />
                    <DetailItem label="Insured value" value={formatCurrency(device.insuredValue)} />
                  </dl>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed bg-[var(--surface-muted)] p-5 text-sm text-[var(--muted)]">No insurance policy is linked to this device.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <DeviceAssignment device={device} onChanged={onChanged} />
      </section>
    </div>
  );
}
