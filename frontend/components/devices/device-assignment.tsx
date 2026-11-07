"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import {
  employeeDepartment,
  employeeName,
  type Device,
  type Employee,
} from "@/lib/domain/device";
import { getDeviceStatus } from "@/lib/format";
import { errorMessage } from "@/lib/services/api-client";
import {
  assignDevice,
  assignmentAvailable,
  listEmployees,
  returnAvailable,
  returnDevice,
} from "@/lib/services/device-service";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface DeviceAssignmentProps {
  device: Device;
  mode: "assign" | "return";
  onClose: () => void;
  onSuccess: () => void;
}

export function DeviceAssignment({
  device,
  mode,
  onClose,
  onSuccess,
}: DeviceAssignmentProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(mode === "assign");
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const isAssign = mode === "assign";
  const endpointAvailable = isAssign ? assignmentAvailable : returnAvailable;
  const correctStatus =
    getDeviceStatus(device.status) === (isAssign ? "available" : "assigned");

  useEffect(() => {
    if (mode !== "assign") return;
    const controller = new AbortController();
    void listEmployees(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setEmployees(records);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setEmployeeError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mode, revision]);

  const selected = employees.find((employee) => employee.id === employeeId);
  const filtered = employees.filter((employee) =>
    [
      employeeName(employee),
      employee.employeeNumber,
      employeeDepartment(employee),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const canConfirm =
    endpointAvailable &&
    correctStatus &&
    !busy &&
    (!isAssign || (!loading && !employeeError && Boolean(selected)));

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!canConfirm || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (isAssign && selected) await assignDevice(device.id, selected.id);
      else await returnDevice(device.id);
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={isAssign ? "Assign Device" : "Return Device"}
      description={
        isAssign
          ? "Select an employee from the backend records."
          : "Confirm the return to update this device through the backend."
      }
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => void confirm(event)}
        aria-busy={busy}
      >
        <div>
          <Label htmlFor="assignment-device">Selected device</Label>
          <Input id="assignment-device" value={device.name} readOnly />
        </div>
        <div>
          <Label htmlFor="assignment-serial">Serial number</Label>
          <Input
            id="assignment-serial"
            value={device.serialNumber ?? ""}
            placeholder="Not provided"
            readOnly
          />
        </div>
        {!endpointAvailable ? (
          <p
            role="status"
            className="rounded-xl bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]"
          >
            {isAssign
              ? "Device assignment is not available on the backend yet. Confirmation is disabled."
              : "Device returns are not available on the backend yet. Confirmation is disabled."}
          </p>
        ) : null}
        {isAssign ? (
          <>
            <div>
              <Label htmlFor="employee-search">Search employees</Label>
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-3 text-[var(--muted)]"
                />
                <Input
                  id="employee-search"
                  className="pl-9"
                  type="search"
                  value={query}
                  disabled={loading || busy}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setEmployeeId("");
                  }}
                  placeholder="Name, employee number, or department"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="employeeId">Employee *</Label>
              <Select
                id="employeeId"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                disabled={loading || busy || Boolean(employeeError)}
              >
                <option value="">
                  {loading ? "Loading employees..." : "Select employee"}
                </option>
                {filtered.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName(employee)}
                    {employee.employeeNumber
                      ? ` (${employee.employeeNumber})`
                      : ""}
                  </option>
                ))}
              </Select>
            </div>
            {loading ? (
              <p role="status" className="text-sm text-[var(--muted)]">
                Loading employee records...
              </p>
            ) : null}
            {!loading && !employeeError && !filtered.length ? (
              <p className="text-sm text-[var(--muted)]">
                No matching employee records returned.
              </p>
            ) : null}
            {employeeError ? (
              <div
                role="alert"
                className="space-y-2 rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
              >
                <p>Employee list unavailable: {employeeError}</p>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setLoading(true);
                    setEmployeeError(null);
                    setEmployeeId("");
                    setRevision((value) => value + 1);
                  }}
                >
                  <RefreshCw size={15} /> Retry employees
                </Button>
              </div>
            ) : null}
            <div>
              <Label htmlFor="employeeNumber">Employee number</Label>
              <Input
                id="employeeNumber"
                value={selected?.employeeNumber ?? ""}
                placeholder="Not provided"
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={selected ? employeeDepartment(selected) : ""}
                placeholder="Not provided"
                readOnly
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-bold uppercase text-[var(--muted)]">
              Current employee
            </p>
            <p className="mt-1 font-bold">
              {device.currentEmployee
                ? employeeName(device.currentEmployee)
                : "Not returned by the backend"}
            </p>
            {device.currentEmployee?.employeeNumber ? (
              <p className="mt-1 text-sm">
                {device.currentEmployee.employeeNumber}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-[var(--muted)]">
              Return {device.name}
              {device.serialNumber ? ` (${device.serialNumber})` : ""} from this
              holder?
            </p>
          </div>
        )}
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canConfirm}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy
              ? "Confirming..."
              : isAssign
                ? "Confirm Assignment"
                : "Confirm Return"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
