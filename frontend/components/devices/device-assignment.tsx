"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Undo2, UserCheck, UserPlus } from "lucide-react";
import { assignDevice, getCurrentAssignment, listEmployees, returnDevice } from "@/lib/api/devices";
import { EndpointUnavailableError } from "@/lib/api/client";
import type { Assignment, Device, Employee } from "@/lib/domain/device";
import { formatDate, normalizeStatus, statusLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface DeviceAssignmentProps {
  device: Device;
  /** Called after the backend accepted an assign/return so the device status is re-read. */
  onChanged: (message: string) => Promise<void>;
}

type HolderState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "error"; message: string }
  | { kind: "ready"; assignment: Assignment | null };

const messageOf = (caught: unknown, fallback: string) => (caught instanceof Error ? caught.message : fallback);

export function DeviceAssignment({ device, onChanged }: DeviceAssignmentProps) {
  const [holder, setHolder] = useState<HolderState>({ kind: "loading" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesState, setEmployeesState] = useState<"idle" | "loading" | "error">("idle");
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [reloadToken, setReloadToken] = useState(0);

  // Re-read the holder whenever the device, its status, or a manual retry changes.
  useEffect(() => {
    let active = true;
    getCurrentAssignment(device.id)
      .then((assignment) => {
        if (active) setHolder({ kind: "ready", assignment });
      })
      .catch((caught) => {
        if (!active) return;
        setHolder(
          caught instanceof EndpointUnavailableError
            ? { kind: "unavailable" }
            : { kind: "error", message: messageOf(caught, "The current holder could not be loaded.") },
        );
      });
    return () => {
      active = false;
    };
  }, [device.id, device.status, reloadToken]);

  function loadHolder() {
    setHolder({ kind: "loading" });
    setReloadToken((token) => token + 1);
  }

  async function openAssign() {
    setActionError(null);
    setEmployeeId("");
    setAssignOpen(true);
    setEmployeesState("loading");
    try {
      setEmployees(await listEmployees());
      setEmployeesState("idle");
    } catch (caught) {
      setEmployeesError(caught instanceof EndpointUnavailableError ? "The backend does not provide an employee list yet, so devices cannot be assigned." : messageOf(caught, "Employees could not be loaded."));
      setEmployeesState("error");
    }
  }

  async function confirmAssign() {
    if (!employeeId) return;
    setBusy(true);
    setActionError(null);
    try {
      await assignDevice(device.id, employeeId);
      setAssignOpen(false);
      await onChanged("Device assigned");
      setReloadToken((token) => token + 1);
    } catch (caught) {
      setActionError(messageOf(caught, "The device could not be assigned."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReturn() {
    setBusy(true);
    setActionError(null);
    try {
      await returnDevice(device.id);
      setReturnOpen(false);
      await onChanged("Device returned");
      setReloadToken((token) => token + 1);
    } catch (caught) {
      setActionError(messageOf(caught, "The device could not be returned."));
    } finally {
      setBusy(false);
    }
  }

  const selected = employees.find((employee) => employee.id === employeeId);
  const kind = normalizeStatus(device.status);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>Who currently holds this device.</CardDescription>
        </div>
        <UserCheck className="text-[var(--primary)]" size={20} />
      </CardHeader>
      <CardContent>
        {holder.kind === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> Checking current holder…</div>
        ) : null}

        {holder.kind === "unavailable" ? (
          <div className="rounded-2xl border border-dashed bg-[var(--surface-muted)] p-5 text-sm text-[var(--muted)]">
            Assignment is not available yet: the backend does not provide the assignment endpoints.
          </div>
        ) : null}

        {holder.kind === "error" ? (
          <div role="alert" className="flex flex-col gap-3 rounded-xl bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between">
            <span>{holder.message}</span>
            <Button variant="secondary" size="sm" onClick={loadHolder}><RefreshCw size={14} /> Try again</Button>
          </div>
        ) : null}

        {holder.kind === "ready" && holder.assignment ? (
          <div className="space-y-4">
            <dl className="rounded-2xl border p-4">
              <p className="text-base font-extrabold">{holder.assignment.employee.fullName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {[holder.assignment.employee.employeeNumber && `Employee ${holder.assignment.employee.employeeNumber}`, holder.assignment.employee.department].filter(Boolean).join(" · ") || "No employee details recorded"}
              </p>
              {holder.assignment.assignedAt ? <p className="mt-2 text-xs text-[var(--muted)]">Assigned {formatDate(holder.assignment.assignedAt)}</p> : null}
            </dl>
            <Button variant="secondary" onClick={() => { setActionError(null); setReturnOpen(true); }}><Undo2 size={16} /> Return device</Button>
          </div>
        ) : null}

        {holder.kind === "ready" && !holder.assignment ? (
          kind === "available" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">This device is available and not assigned to anyone.</p>
              <Button onClick={() => void openAssign()}><UserPlus size={16} /> Assign device</Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-[var(--surface-muted)] p-5 text-sm text-[var(--muted)]">
              {kind === "assigned"
                ? "This device is marked as assigned, but no current holder is recorded."
                : `This device is ${statusLabel(device.status).toLowerCase()} and cannot be assigned.`}
            </div>
          )
        ) : null}
      </CardContent>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen} title="Assign device" description={`Choose who will hold ${device.name}.`}>
        <div className="space-y-4 p-5">
          {employeesState === "loading" ? <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> Loading employees…</div> : null}
          {employeesState === "error" ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{employeesError}</p> : null}
          {employeesState === "idle" ? (
            <div>
              <Label htmlFor="assign-employee">Employee *</Label>
              <Select id="assign-employee" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={!employees.length}>
                <option value="">{employees.length ? "Select an employee" : "No employees available"}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
              </Select>
              {selected ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {[selected.employeeNumber && `Employee number ${selected.employeeNumber}`, selected.department && `Department ${selected.department}`].filter(Boolean).join(" · ") || "No employee number or department recorded"}
                </p>
              ) : null}
            </div>
          ) : null}
          {actionError ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{actionError}</p> : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => void confirmAssign()} disabled={!employeeId || busy}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Assign device
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen} title="Return device" description="The device will become available again.">
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Record that <strong className="text-[var(--foreground)]">{device.name}</strong> has been returned
            {holder.kind === "ready" && holder.assignment ? <> by <strong className="text-[var(--foreground)]">{holder.assignment.employee.fullName}</strong></> : null}?
          </p>
          {actionError ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{actionError}</p> : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={() => void confirmReturn()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Undo2 size={16} />} Return device
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
