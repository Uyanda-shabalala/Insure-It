"use client";

import { useMemo, useState } from "react";
import { Download, Plus, RotateCcw, Search, SlidersHorizontal, Smartphone } from "lucide-react";
import type { Device, DeviceStatus } from "@/lib/domain/device";
import { formatCurrency, formatDate, getDeviceStatus } from "@/lib/format";
import { exportDevicesCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeviceIcon } from "@/components/shared/device-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";

interface DeviceInventoryProps {
  devices: Device[];
  onOpen: (id: string) => void;
  onAdd: () => void;
  onReset: () => void;
}

type StatusFilter = "all" | DeviceStatus;
type SortOption = "recent" | "name" | "expiry" | "insurer";

export function DeviceInventory({ devices, onOpen, onAdd, onReset }: DeviceInventoryProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("recent");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...devices]
      .filter((device) => {
        const matchesQuery =
          !query ||
          [device.name, device.serial, device.insurer, device.policyNumber, device.type]
            .join(" ")
            .toLowerCase()
            .includes(query);
        return matchesQuery && (status === "all" || getDeviceStatus(device.expiryDate) === status);
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "expiry") return a.expiryDate.localeCompare(b.expiryDate);
        if (sort === "insurer") return a.insurer.localeCompare(b.insurer);
        return b.updatedAt - a.updatedAt;
      });
  }, [devices, search, sort, status]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--primary)]">Asset inventory</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Insured devices</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Search policy evidence, review cover, and export an audit-ready device list.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportDevicesCsv(devices)} disabled={!devices.length}>
            <Download size={16} /> Export CSV
          </Button>
          <Button onClick={onAdd}><Plus size={16} /> Add device</Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="relative">
            <span className="sr-only">Search devices</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
            <Input className="pl-10" type="search" placeholder="Search device, serial, insurer, or policy..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Sort devices</span>
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="recent">Recently updated</option>
              <option value="name">Name A–Z</option>
              <option value="expiry">Expiry date</option>
              <option value="insurer">Insurer</option>
            </Select>
          </label>
          <Button variant="ghost" onClick={onReset} title="Restore the supplied demo records">
            <RotateCcw size={16} /> Reset demo
          </Button>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState
          icon={Smartphone}
          title="No matching devices"
          description="Adjust the search and filters, or capture a new insured device."
          actionLabel="Add device"
          onAction={onAdd}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-[var(--surface)] lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-bold">Device</th>
                  <th className="px-5 py-3 font-bold">Insurance</th>
                  <th className="px-5 py-3 font-bold">Cover</th>
                  <th className="px-5 py-3 font-bold">Expiry</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((device) => (
                  <tr key={device.id} className="cursor-pointer transition hover:bg-[var(--surface-muted)]" onClick={() => onOpen(device.id)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                          {device.photo ? <img src={device.photo} alt="" className="size-full object-cover" /> : <DeviceIcon type={device.type} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold">{device.name}</p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">{device.type} · {device.serial || "No serial"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{device.insurer}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{device.policyNumber || "No policy number"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{formatCurrency(device.sumInsured)}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{formatCurrency(device.premium)} / month</p>
                    </td>
                    <td className="px-5 py-4 font-semibold">{formatDate(device.expiryDate)}</td>
                    <td className="px-5 py-4"><StatusBadge status={getDeviceStatus(device.expiryDate)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((device) => (
              <button key={device.id} onClick={() => onOpen(device.id)} className="focus-ring rounded-2xl border bg-[var(--surface)] p-4 text-left shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                    {device.photo ? <img src={device.photo} alt="" className="size-full object-cover" /> : <DeviceIcon type={device.type} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{device.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{device.serial || "No serial"}</p>
                      </div>
                      <StatusBadge status={getDeviceStatus(device.expiryDate)} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                      <div><p className="text-[var(--muted)]">Insurer</p><p className="mt-1 font-bold">{device.insurer}</p></div>
                      <div><p className="text-[var(--muted)]">Sum insured</p><p className="mt-1 font-bold">{formatCurrency(device.sumInsured)}</p></div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><SlidersHorizontal size={14} /> Showing {filtered.length} of {devices.length} devices</p>
    </div>
  );
}
