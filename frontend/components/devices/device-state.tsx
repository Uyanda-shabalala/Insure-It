"use client";
import { useState } from "react";
import type { Device } from "@/lib/domain/device";
import { request } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DeviceState({ device, onChanged }: { device: Device; onChanged: (message: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const status = device.status.toLowerCase();
  const actions = status === "repair" ? [["complete_repair", "Complete repair"], ["mark_lost", "Mark as lost"]]
    : status === "lost" ? [["recover", "Record recovery"]]
    : ["available", "assigned"].includes(status) ? [["send_for_repair", "Send for repair"], ["mark_lost", "Mark as lost"], ...(status === "available" ? [["retire", "Retire device"]] : [])] : [];
  async function change(action: string) {
    setBusy(true); setError("");
    try {
      await request(`/api/devices/${encodeURIComponent(device.id)}/state`, { method: "PATCH", body: { action }, missingMeansUnavailable: false });
      setConfirm(false); await onChanged("Device state updated");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update device"); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Device state</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-[var(--muted)]">Repairs and loss retain the current holder. Return a device before retiring it. Retirement is permanent.</p>
    <div className="flex flex-wrap gap-2">{actions.map(([action, label]) => <Button key={action} variant="secondary" disabled={busy} onClick={() => action === "retire" ? setConfirm(true) : void change(action)}>{label}</Button>)}</div>
    {confirm && <div className="space-y-2"><p>Retire {device.name}? It cannot be assigned again.</p><Button disabled={busy} onClick={() => void change("retire")}>Confirm retirement</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div>}
    {!actions.length && <p className="text-sm">This device is retired.</p>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
  </CardContent></Card>;
}
