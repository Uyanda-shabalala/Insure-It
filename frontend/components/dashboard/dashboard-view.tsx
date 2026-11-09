import { AlertTriangle, Banknote, Building2, Layers3, Plus, ShieldCheck, WalletCards } from "lucide-react";
import type { Device } from "@/lib/domain/device";
import { formatCurrency, formatRelativeTime, getDeviceStatus, summarizeDevices } from "@/lib/format";
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
  const recent = [...devices].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  const attention = devices
    .filter((device) => getDeviceStatus(device.expiryDate) !== "active")
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-[var(--surface)] shadow-sm">
        <div className="grid gap-6 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_18%,var(--surface)),var(--surface)_62%)] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              <ShieldCheck size={14} /> Insurance asset control
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Every insured device, policy, and claim in one place.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Keep serials, cover values, renewal dates, evidence, and claims ready for action without relying on scattered spreadsheets.
            </p>
          </div>
          <Button size="lg" onClick={onAdd} className="w-full lg:w-auto">
            <Plus size={18} /> Add device
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Insured devices" value={summary.total} helper={`${summary.active} with active cover`} icon={Layers3} />
        <MetricCard label="Needs attention" value={summary.expiring + summary.expired} helper={`${summary.expiring} expiring, ${summary.expired} expired`} icon={AlertTriangle} />
        <MetricCard label="Monthly premium" value={formatCurrency(summary.monthlyPremium)} helper={`Across ${summary.insurers} insurers`} icon={WalletCards} />
        <MetricCard label="Total insured value" value={formatCurrency(summary.sumInsured)} helper={`${summary.claims} claims recorded`} icon={Banknote} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Recently added or updated device records.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onOpenInventory}>View all</Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {recent.map((device) => (
                <button
                  key={device.id}
                  onClick={() => onOpenDevice(device.id)}
                  className="focus-ring flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition hover:bg-[var(--surface-muted)]"
                >
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--surface-muted)] text-[var(--primary)]">
                    {device.photo ? <img src={device.photo} alt="" className="size-full object-cover" /> : <DeviceIcon type={device.type} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{device.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{device.insurer} · {formatRelativeTime(device.updatedAt)}</p>
                  </div>
                  <StatusBadge status={getDeviceStatus(device.expiryDate)} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Renewal watch</CardTitle>
              <CardDescription>Policies requiring the next action.</CardDescription>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]">
              <Building2 size={18} />
            </div>
          </CardHeader>
          <CardContent>
            {attention.length ? (
              <div className="space-y-3">
                {attention.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => onOpenDevice(device.id)}
                    className="focus-ring flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-[var(--surface-muted)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{device.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{device.insurer} · {device.expiryDate}</p>
                    </div>
                    <StatusBadge status={getDeviceStatus(device.expiryDate)} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--success-soft)] p-5 text-sm text-[var(--success)]">
                All policies are outside the 90-day renewal window.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
