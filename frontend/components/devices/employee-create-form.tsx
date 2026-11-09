"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import type { EmployeeInput } from "@/lib/api/devices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmployeeCreateFormProps {
  onSave: (values: EmployeeInput) => Promise<void>;
  onCancel: () => void;
}

export function EmployeeCreateForm({ onSave, onCancel }: EmployeeCreateFormProps) {
  const [values, setValues] = useState<EmployeeInput>({ employeeNumber: "", fullName: "", email: "", department: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof EmployeeInput, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!values.employeeNumber.trim() || !values.fullName.trim()) {
      setError("Enter an employee number and full name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(values);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The employee could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5 p-5">
      <p className="text-sm text-[var(--muted)]">Add their details, then confirm the device assignment. Fields marked * are required.</p>
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <legend className="sr-only">Employee details</legend>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-employee-number">Employee number *</Label>
          <Input id="new-employee-number" autoFocus required value={values.employeeNumber} onChange={(event) => update("employeeNumber", event.target.value)} placeholder="e.g. EMP001" autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-employee-name">Full name *</Label>
          <Input id="new-employee-name" required value={values.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="e.g. Jane Doe" autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-employee-email">Email (optional)</Label>
          <Input id="new-employee-email" type="email" value={values.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-employee-department">Department (optional)</Label>
          <Input id="new-employee-department" value={values.department} onChange={(event) => update("department", event.target.value)} placeholder="e.g. Finance" autoComplete="organization-title" />
        </div>
      </fieldset>
      {error ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>Back to assignment</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
          {busy ? "Saving employee…" : "Save employee"}
        </Button>
      </div>
    </form>
  );
}
