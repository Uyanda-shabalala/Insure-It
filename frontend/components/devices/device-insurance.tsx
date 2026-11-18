"use client";
import { useEffect, useState } from "react";
import type { Device, InsurancePolicy } from "@/lib/domain/device";
import { readableText } from "@/lib/domain/device";
import { request } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Provider { id: string; name: string; phoneNumber: string | null }
export function DeviceInsurance({ device, onChanged }: { device: Device; onChanged: (message: string) => Promise<void> }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [provider, setProvider] = useState("");
  const [policy, setPolicy] = useState(device.insurancePolicy?.id ?? "");
  const [value, setValue] = useState(device.insuredValue?.toString() ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"none" | "provider" | "policy">("none");
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [number, setNumber] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([request<Provider[]>("/api/insurance-providers"), request<InsurancePolicy[]>("/api/insurance-policies")]).then(([a,b]) => {
      if (!active) return;
      setProviders(a ?? []); setPolicies(b ?? []);
      setProvider(a?.find(p => p.name === device.insurancePolicy?.insurerName)?.id ?? "");
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [device.id, device.insurancePolicy?.insurerName]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch(e) { setError(e instanceof Error ? e.message : "Could not update insurance"); }
    finally { setBusy(false); }
  }
  const selected = providers.find(p => p.id === provider);
  const choices = policies.filter(p => !selected || p.insurerName === selected.name);
  return <div className="mt-5 space-y-3 border-t pt-4">
    <label className="block text-sm font-semibold">Insurance provider
      <select className="mt-1 w-full rounded-xl border bg-[var(--surface)] p-3" value={provider} disabled={busy} onChange={e => { setProvider(e.target.value); setPolicy(""); }}>
        <option value="">Choose provider</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
    {selected?.phoneNumber && <p className="text-sm">Phone: <a href={`tel:${selected.phoneNumber.replace(/[^+0-9]/g, "")}`}>{selected.phoneNumber}</a></p>}
    <label className="block text-sm font-semibold">Policy
      <select className="mt-1 w-full rounded-xl border bg-[var(--surface)] p-3" value={policy} disabled={busy} onChange={e => setPolicy(e.target.value)}>
        <option value="">No policy</option>{choices.map(p => <option key={p.id} value={p.id}>{p.insurerName} — {p.policyNumber}</option>)}
      </select>
    </label>
    <label className="block text-sm font-semibold">Insured value (optional)<Input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void run(async () => {
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0 || !/^\d+(\.\d{1,2})?$/.test(value))) throw new Error("Enter a non-negative amount with up to two decimal places");
      await request(`/api/devices/${device.id}/insurance`, { method: "PATCH", body: { policyId: policy || null, insuredValue: value ? Number(value) : null }, missingMeansUnavailable: false });
      await onChanged(policy ? "Insurance linked" : "Insurance removed");
    })}>Save insurance</Button><Button variant="ghost" disabled={busy} onClick={() => setMode("provider")}>Add provider</Button><Button variant="ghost" disabled={busy || !provider} onClick={() => setMode("policy")}>Add policy</Button></div>
    {mode === "provider" && <form className="space-y-3 rounded-xl border p-3" onSubmit={e => { e.preventDefault(); void run(async () => {
      const valid = readableText(true).safeParse(name); if (!valid.success) throw new Error("Enter a valid provider name");
      const added = await request<Provider>("/api/insurance-providers", { method: "POST", body: { name: valid.data, phoneNumber: phone } });
      if (added) { setProviders(p => [...p, added]); setProvider(added.id); setPolicy(""); setMode("none"); setName(""); setPhone(""); }
    }); }}><label className="block text-sm">Provider name<Input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label className="block text-sm">Phone number (optional)<Input type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} /></label><Button disabled={busy} type="submit">Create provider</Button><Button type="button" variant="ghost" onClick={() => setMode("none")}>Cancel</Button></form>}
    {mode === "policy" && <form className="space-y-3 rounded-xl border p-3" onSubmit={e => { e.preventDefault(); void run(async () => {
      if (!readableText(true).safeParse(number).success || !start || !end || end < start) throw new Error("Enter a valid policy number and cover dates");
      const added = await request<InsurancePolicy>("/api/insurance-policies", { method: "POST", body: { providerId: provider, policyNumber: number.trim(), startDate: start, endDate: end } });
      if (added) { setPolicies(p => [...p, added]); setPolicy(added.id); setMode("none"); setNumber(""); }
    }); }}><p className="text-sm font-semibold">New policy for {selected?.name}</p><label className="block text-sm">Policy number<Input required maxLength={120} value={number} onChange={e => setNumber(e.target.value)} /></label><label className="block text-sm">Cover starts<Input required type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label className="block text-sm">Cover ends<Input required type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label><Button disabled={busy} type="submit">Create policy</Button><Button type="button" variant="ghost" onClick={() => setMode("none")}>Cancel</Button></form>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
  </div>;
}
