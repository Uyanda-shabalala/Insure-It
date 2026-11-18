import { Building2, CheckCircle2, Layers3, Plus, ShieldCheck, UserCheck, Wrench } from "lucide-react";
import type { Device } from "@/lib/domain/device";
import { brandModel, formatDate, formatRelativeTime, getCoverStatus, summarizeDevices } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeviceIcon } from "@/components/shared/device-icon";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";

interface DashboardViewProps {
  devices: Device[];
  onAdd: () => void;
  onOpenDevice: (id: string) => void;
  onOpenInventory: () => void;
}

export function DashboardView({ devices, onAdd, onOpenDevice, onOpenInventory }: DashboardViewProps) {
  const summary = summarizeDevices(devices);
  const recent = [...devices].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5);
  // Insurance is optional: only devices with a linked policy that is expiring or expired are listed.
  const attention = devices
    .filter((device) => device.insurancePolicy && getCoverStatus(device.insurancePolicy.endDate) !== "active")
    .sort((a, b) => (a.insurancePolicy?.endDate ?? "").localeCompare(b.insurancePolicy?.endDate ?? ""))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-[var(--surface)] shadow-sm">
        <div className="grid gap-6 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_18%,var(--surface)),var(--surface)_62%)] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              <ShieldCheck size={14} /> Device asset control
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Every registered device and who holds it, in one place.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Register devices, see what is available, assign equipment to employees, and track insurance policies without scattered spreadsheets.
            </p>
          </div>
          <Button size="lg" onClick={onAdd} className="w-full lg:w-auto">
            <Plus size={18} /> Add device
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registered devices" value={summary.total} helper="Total in the inventory" icon={Layers3} />
        <MetricCard label="Available" value={summary.available} helper="Ready to assign" icon={CheckCircle2} />
        <MetricCard label="Assigned" value={summary.assigned} helper="Currently with an employee" icon={UserCheck} />
        <MetricCard label="Under repair" value={summary.underRepair} helper="Not available for use" icon={Wrench} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent devices</CardTitle>
              <CardDescription>The most recently registered devices and their status.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onOpenInventory}>View all</Button>
          </CardHeader>
          <CardContent>
            {recent.length ? (
              <div className="divide-y">
                {recent.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => onOpenDevice(device.id)}
                    className="focus-ring flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition hover:bg-[var(--surface-muted)]"
                  >
                    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--surface-muted)] text-[var(--primary)]">
                      <DeviceIcon type={device.deviceTypeName} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{device.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{[brandModel(device), formatRelativeTime(device.createdAt)].filter(Boolean).join(" · ")}</p>
                    </div>
                    <StatusBadge status={device.status} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-[var(--surface-muted)] p-6 text-sm text-[var(--muted)]">No devices registered yet. Add a device to see it here.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Renewal watch</CardTitle>
              <CardDescription>Insurance policies that are expiring or have expired.</CardDescription>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]">
              <Building2 size={18} />
            </div>
          </CardHeader>
          <CardContent>
            {attention.length ? (
              <div className="space-y-3">
                {attention.map((device) => {
                  const cover = getCoverStatus(device.insurancePolicy?.endDate ?? null);
                  return (
                    <button
                      key={device.id}
                      onClick={() => onOpenDevice(device.id)}
                      className="focus-ring flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-[var(--surface-muted)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{device.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{device.insurancePolicy?.insurerName} · {formatDate(device.insurancePolicy?.endDate)}</p>
                      </div>
                      <Badge variant={cover === "expired" ? "danger" : "warning"}>{cover === "expired" ? "Expired" : "Expiring soon"}</Badge>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--success-soft)] p-5 text-sm text-[var(--success)]">
                No linked policies are expiring within 90 days.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
