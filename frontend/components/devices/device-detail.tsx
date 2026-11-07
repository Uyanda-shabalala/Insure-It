"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  employeeDepartment,
  employeeName,
  type Device,
} from "@/lib/domain/device";
import { getDeviceStatus } from "@/lib/format";
import { errorMessage } from "@/lib/services/api-client";
import {
  assignmentAvailable,
  getDevice,
  returnAvailable,
} from "@/lib/services/device-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiState } from "@/components/shared/api-state";
import { DeviceAssignment } from "@/components/devices/device-assignment";

interface DeviceDetailProps {
  deviceId: string;
  onBack: () => void;
  onChanged: () => void;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

const policyFields: Record<string, string> = {
  id: "Policy ID",
  name: "Policy name",
  policyNumber: "Policy number",
  provider: "Provider",
  insurer: "Insurer",
  startDate: "Start date",
  endDate: "End date",
  expiryDate: "Expiry date",
  status: "Policy status",
};

export function DeviceDetail({
  deviceId,
  onBack,
  onChanged,
}: DeviceDetailProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<"assign" | "return" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getDevice(deviceId, controller.signal)
      .then((record) => {
        if (!controller.signal.aborted) {
          setDevice(record);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [deviceId, revision]);

  function refresh() {
    setLoading(true);
    setError(null);
    setRevision((value) => value + 1);
  }
  const ready = device && !loading && !error;
  const status = getDeviceStatus(device?.status);
  const policyRows = device?.insurancePolicy
    ? Object.entries(device.insurancePolicy).filter(
        ([key, value]) =>
          policyFields[key] &&
          (typeof value === "string" || typeof value === "number"),
      )
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="-ml-3" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Inventory
        </Button>
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} /> Refresh details
        </Button>
      </header>
      <ApiState loading={loading} error={error} onRetry={refresh} />
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-[var(--success-soft)] p-4 text-sm text-[var(--success)]"
        >
          {notice}
        </p>
      ) : null}
      {ready ? (
        <>
          <div>
            <p className="text-sm font-bold text-[var(--primary)]">
              Device Details
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="break-words text-3xl font-extrabold tracking-tight">
                {device.name}
              </h1>
              <StatusBadge status={device.status} />
            </div>
            <p className="mt-2 break-all text-sm text-[var(--muted)]">
              {device.serialNumber || "Serial number not provided"}
            </p>
          </div>
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Device Information</CardTitle>
                  <CardDescription>
                    Authoritative asset details returned by the backend.
                  </CardDescription>
                </div>
                <Wrench size={20} className="text-[var(--primary)]" />
              </CardHeader>
              <CardContent>
                <dl>
                  <DetailItem label="Device name" value={device.name} />
                  <DetailItem label="Brand" value={device.brand.name} />
                  <DetailItem label="Model" value={device.model} />
                  <DetailItem
                    label="Device type"
                    value={device.deviceType.name}
                  />
                  <DetailItem
                    label="Serial number"
                    value={device.serialNumber}
                  />
                  <DetailItem label="Location" value={device.location} />
                  <DetailItem
                    label="Lifecycle status"
                    value={<StatusBadge status={device.status} />}
                  />
                </dl>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Assignment Information</CardTitle>
                    <CardDescription>
                      Current holder information, when supplied by the backend.
                    </CardDescription>
                  </div>
                  <UserRound size={20} className="text-[var(--primary)]" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl>
                    <DetailItem
                      label="Current employee"
                      value={
                        device.currentEmployee
                          ? employeeName(device.currentEmployee)
                          : status === "available"
                            ? "No employee assigned"
                            : "Not returned by the backend"
                      }
                    />
                    <DetailItem
                      label="Employee number"
                      value={device.currentEmployee?.employeeNumber}
                    />
                    <DetailItem
                      label="Department"
                      value={
                        device.currentEmployee
                          ? employeeDepartment(device.currentEmployee)
                          : null
                      }
                    />
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={status !== "available"}
                      onClick={() => setAction("assign")}
                    >
                      <UserRound size={16} /> Assign Device
                    </Button>
                    {status === "assigned" ? (
                      <Button
                        variant="secondary"
                        onClick={() => setAction("return")}
                      >
                        <ArrowRightLeft size={16} /> Return Device
                      </Button>
                    ) : null}
                  </div>
                  {status !== "available" ? (
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Only available devices can be assigned.
                    </p>
                  ) : null}
                  {!assignmentAvailable || !returnAvailable ? (
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      {!assignmentAvailable
                        ? "Assignment confirmation is unavailable until the backend endpoint is connected. "
                        : ""}
                      {!returnAvailable
                        ? "Return confirmation is unavailable until the backend endpoint is connected."
                        : ""}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Insurance Information</CardTitle>
                    <CardDescription>
                      Optional policy information linked to this asset.
                    </CardDescription>
                  </div>
                  <ShieldCheck size={20} className="text-[var(--primary)]" />
                </CardHeader>
                <CardContent>
                  {device.insurancePolicy ? (
                    policyRows.length ? (
                      <dl>
                        {policyRows.map(([key, value]) => (
                          <DetailItem
                            key={key}
                            label={policyFields[key]}
                            value={String(value)}
                          />
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">
                        Policy linked; additional details were not returned.
                      </p>
                    )
                  ) : (
                    <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">
                      Uninsured / No policy linked
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
          {action ? (
            <DeviceAssignment
              key={`${device.id}-${action}`}
              device={device}
              mode={action}
              onClose={() => setAction(null)}
              onSuccess={() => {
                setNotice(
                  action === "assign"
                    ? "Assignment confirmed by the backend. Refreshing device records."
                    : "Return confirmed by the backend. Refreshing device records.",
                );
                refresh();
                onChanged();
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
