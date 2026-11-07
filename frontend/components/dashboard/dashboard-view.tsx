import {
  CheckCircle2,
  Layers3,
  Plus,
  ScanLine,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { Device } from "@/lib/domain/device";
import { deviceTimestamp, summarizeDevices } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeviceIcon } from "@/components/shared/device-icon";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiState } from "@/components/shared/api-state";

interface DashboardViewProps {
  devices: Device[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: () => void;
  onCapture: () => void;
  onOpenDevice: (id: string) => void;
  onOpenInventory: () => void;
}

export function DashboardView({
  devices,
  isLoading,
  error,
  onRetry,
  onAdd,
  onCapture,
  onOpenDevice,
  onOpenInventory,
}: DashboardViewProps) {
  const ready = devices !== null && !isLoading && !error;
  const summary = ready ? summarizeDevices(devices) : null;
  const recent = ready
    ? [...devices]
        .sort((a, b) => deviceTimestamp(b) - deviceTimestamp(a))
        .slice(0, 5)
    : [];
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-[var(--surface)] shadow-sm">
        <div className="grid gap-6 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_18%,var(--surface)),var(--surface)_62%)] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              <ShieldCheck size={14} /> IT asset management
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your devices, locations, and people in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Register IT assets, review availability, and track who holds each
              device.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="secondary" onClick={onCapture}>
              <ScanLine size={18} /> Scan serial
            </Button>
            <Button size="lg" onClick={onAdd}>
              <Plus size={18} /> Register Device
            </Button>
          </div>
        </div>
      </section>
      <ApiState loading={isLoading} error={error} onRetry={onRetry} />
      {summary ? (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Device lifecycle metrics"
          >
            <MetricCard
              label="Total Devices"
              value={summary.total}
              helper="Registered IT assets"
              icon={Layers3}
            />
            <MetricCard
              label="Available Devices"
              value={summary.available}
              helper="Ready for assignment"
              icon={CheckCircle2}
            />
            <MetricCard
              label="Assigned Devices"
              value={summary.assigned}
              helper="Currently assigned"
              icon={Users}
            />
            <MetricCard
              label="Under Repair"
              value={summary.repair}
              helper="Unavailable for assignment"
              icon={Wrench}
            />
          </section>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Devices</CardTitle>
                <CardDescription>
                  Recently registered devices from the backend inventory.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onOpenInventory}>
                View Inventory
              </Button>
            </CardHeader>
            <CardContent>
              {!recent.length ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <p className="text-sm text-[var(--muted)]">
                    No devices registered yet.
                  </p>
                  <Button className="mt-4" onClick={onAdd}>
                    Register Device
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {recent.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => onOpenDevice(device.id)}
                      className="focus-ring flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-[var(--surface-muted)]"
                    >
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                        <DeviceIcon type={device.deviceType.name ?? "Other"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {device.name}
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {device.serialNumber || "No serial provided"} ·{" "}
                          {device.location || "Location not provided"}
                        </p>
                      </div>
                      <StatusBadge status={device.status} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
