"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";
import {
  employeeName,
  lifecycleStatuses,
  type Device,
} from "@/lib/domain/device";
import { deviceTimestamp, getDeviceStatus, statusLabel } from "@/lib/format";
import { exportDevicesCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeviceIcon } from "@/components/shared/device-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiState } from "@/components/shared/api-state";

interface DeviceInventoryProps {
  devices: Device[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

// Filter keys belong to this view only; names are not submitted as API IDs.
function deviceTypeKey(device: Device) {
  return device.deviceType.id
    ? `id:${device.deviceType.id}`
    : `name:${device.deviceType.name ?? ""}`;
}

export function DeviceInventory({
  devices,
  isLoading,
  error,
  onRetry,
  onOpen,
  onAdd,
}: DeviceInventoryProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("recent");
  const ready = devices !== null && !isLoading && !error;
  const types = useMemo(
    () => [
      ...new Map(
        (devices ?? []).map((device) => [
          deviceTypeKey(device),
          device.deviceType.name || device.deviceType.id || "Name not provided",
        ]),
      ).entries(),
    ],
    [devices],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(devices ?? [])]
      .filter((device) => {
        const haystack = [
          device.name,
          device.serialNumber,
          device.brand.name,
          device.model,
          device.deviceType.name,
          device.location,
          device.currentEmployee ? employeeName(device.currentEmployee) : "",
          device.currentEmployee?.employeeNumber,
        ]
          .join(" ")
          .toLowerCase();
        return (
          (!query || haystack.includes(query)) &&
          (status === "all" || getDeviceStatus(device.status) === status) &&
          (type === "all" || deviceTypeKey(device) === type)
        );
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "location"
            ? (a.location ?? "").localeCompare(b.location ?? "")
            : deviceTimestamp(b) - deviceTimestamp(a),
      );
  }, [devices, search, status, type, sort]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--primary)]">
            Asset inventory
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Device Inventory
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Find devices, review lifecycle status, and see their current
            holders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onRetry} disabled={isLoading}>
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportDevicesCsv(filtered)}
            disabled={!ready || !filtered.length}
          >
            <Download size={16} /> Export CSV
          </Button>
          <Button onClick={onAdd}>
            <Plus size={16} /> Register Device
          </Button>
        </div>
      </header>
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(200px,1fr)_160px_160px_170px]">
          <label className="relative">
            <span className="sr-only">Search devices</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={16}
            />
            <Input
              className="pl-10"
              type="search"
              placeholder="Search device, serial, location, or employee..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by lifecycle status</span>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              {lifecycleStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
              <option value="unknown">Other status</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Filter by device type</span>
            <Select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All types</option>
              {types.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="sr-only">Sort devices</span>
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Newest first</option>
              <option value="name">Name A-Z</option>
              <option value="location">Location</option>
            </Select>
          </label>
        </div>
      </Card>
      <ApiState loading={isLoading} error={error} onRetry={onRetry} />
      {ready ? (
        !filtered.length ? (
          <EmptyState
            icon={Smartphone}
            title={devices.length ? "No matching devices" : "No devices yet"}
            description={
              devices.length
                ? "Adjust the search or filters to find a device."
                : "Register your first IT asset manually or use Capture to scan its serial."
            }
            actionLabel="Register Device"
            onAction={onAdd}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border bg-[var(--surface)] lg:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    {[
                      "Device",
                      "Serial number",
                      "Type / Location",
                      "Status",
                      "Current employee",
                      "Action",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-bold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((device) => (
                    <tr key={device.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                            <DeviceIcon
                              type={device.deviceType.name ?? "Other"}
                            />
                          </div>
                          <div>
                            <p className="font-bold">{device.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {[device.brand.name, device.model]
                                .filter(Boolean)
                                .join(" · ") || "Brand/model not provided"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="break-all px-4 py-4">
                        {device.serialNumber || "Not provided"}
                      </td>
                      <td className="px-4 py-4">
                        <p>{device.deviceType.name || "Name not provided"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {device.location || "Location not provided"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={device.status} />
                      </td>
                      <td className="px-4 py-4">
                        {device.currentEmployee
                          ? employeeName(device.currentEmployee)
                          : "Not provided"}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`View Details for ${device.name}`}
                          onClick={() => onOpen(device.id)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 lg:hidden">
              {filtered.map((device) => (
                <Card key={device.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-bold">{device.name}</h2>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {[device.brand.name, device.model]
                          .filter(Boolean)
                          .join(" · ") || "Brand/model not provided"}
                      </p>
                    </div>
                    <StatusBadge status={device.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                    <div>
                      <dt className="text-[var(--muted)]">Serial number</dt>
                      <dd className="mt-1 break-all font-semibold">
                        {device.serialNumber || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Device type</dt>
                      <dd className="mt-1 font-semibold">
                        {device.deviceType.name || "Name not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Location</dt>
                      <dd className="mt-1 font-semibold">
                        {device.location || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Current employee</dt>
                      <dd className="mt-1 font-semibold">
                        {device.currentEmployee
                          ? employeeName(device.currentEmployee)
                          : "Not provided"}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    className="mt-4 w-full"
                    variant="secondary"
                    aria-label={`View Details for ${device.name}`}
                    onClick={() => onOpen(device.id)}
                  >
                    View Details
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )
      ) : null}
      {ready ? (
        <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <SlidersHorizontal size={14} /> Showing {filtered.length} of{" "}
          {devices.length} devices
        </p>
      ) : null}
    </div>
  );
}
