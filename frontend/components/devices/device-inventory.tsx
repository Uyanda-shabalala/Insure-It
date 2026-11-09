"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search, SlidersHorizontal, Smartphone } from "lucide-react";
import type { Device } from "@/lib/domain/device";
import { brandModel, normalizeStatus, statusLabel } from "@/lib/format";
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
}

type SortOption = "recent" | "name" | "brand" | "type";

export function DeviceInventory({ devices, onOpen, onAdd }: DeviceInventoryProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");

  // Status filter options come from the data so any status the backend uses can be filtered.
  const statusOptions = useMemo(() => {
    const known = ["available", "assigned", "under_repair"];
    const labels = new Map<string, string>([
      ["available", "Available"],
      ["assigned", "Assigned"],
      ["under_repair", "Under repair"],
    ]);
    for (const device of devices) {
      if (normalizeStatus(device.status) === "other") labels.set(device.status, statusLabel(device.status));
    }
    return [...labels.entries()].sort(([a], [b]) => {
      const ai = known.indexOf(a);
      const bi = known.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [devices]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...devices]
      .filter((device) => {
        const matchesQuery =
          !query ||
          [device.name, device.serialNumber, device.brandName, device.model, device.deviceTypeName, device.location]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const kind = normalizeStatus(device.status);
        const matchesStatus = status === "all" || (kind === "other" ? device.status === status : kind === status);
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "brand") return (a.brandName).localeCompare(b.brandName);
        if (sort === "type") return (a.deviceTypeName).localeCompare(b.deviceTypeName);
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
  }, [devices, search, sort, status]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--primary)]">Asset inventory</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Registered devices</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Search devices, check their status, and open a device to see its full details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportDevicesCsv(devices)} disabled={!devices.length}>
            <Download size={16} /> Export CSV
          </Button>
          <Button onClick={onAdd}><Plus size={16} /> Add device</Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <span className="sr-only">Search devices</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
            <Input className="pl-10" type="search" placeholder="Search name, serial, brand, model, or location..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </label>
          <label>
            <span className="sr-only">Sort devices</span>
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="recent">Recently added</option>
              <option value="name">Name A–Z</option>
              <option value="brand">Brand</option>
              <option value="type">Device type</option>
            </Select>
          </label>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState
          icon={Smartphone}
          title={devices.length ? "No matching devices" : "No devices registered yet"}
          description={devices.length ? "Adjust the search and filters to see more devices." : "Register your first device to start the inventory."}
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
                  <th className="px-5 py-3 font-bold">Brand / model</th>
                  <th className="px-5 py-3 font-bold">Serial number</th>
                  <th className="px-5 py-3 font-bold">Type</th>
                  <th className="px-5 py-3 font-bold">Location</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((device) => (
                  <tr key={device.id} className="cursor-pointer transition hover:bg-[var(--surface-muted)]" onClick={() => onOpen(device.id)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                          <DeviceIcon type={device.deviceTypeName} />
                        </div>
                        <p className="font-bold">{device.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold">{brandModel(device) || "—"}</td>
                    <td className="px-5 py-4">{device.serialNumber || <span className="text-[var(--muted)]">No serial</span>}</td>
                    <td className="px-5 py-4">{device.deviceTypeName ?? "—"}</td>
                    <td className="px-5 py-4">{device.location || <span className="text-[var(--muted)]">Not set</span>}</td>
                    <td className="px-5 py-4"><StatusBadge status={device.status} /></td>
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
                    <DeviceIcon type={device.deviceTypeName} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{device.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{device.serialNumber || "No serial"}</p>
                      </div>
                      <StatusBadge status={device.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                      <div><p className="text-[var(--muted)]">Brand / model</p><p className="mt-1 font-bold">{brandModel(device) || "—"}</p></div>
                      <div><p className="text-[var(--muted)]">Type</p><p className="mt-1 font-bold">{device.deviceTypeName ?? "—"}</p></div>
                      <div className="col-span-2"><p className="text-[var(--muted)]">Location</p><p className="mt-1 font-bold">{device.location || "Not set"}</p></div>
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
