"use client";
import { useRef, useState } from "react";
import type { DeviceDraft } from "@/lib/domain/device";
import { serialText } from "@/lib/domain/device";
import { request } from "@/lib/api/client";
import { imageFileToDataUrl, dataUrlToBlob } from "@/lib/services/image-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
interface Item { id: string; photo: string; serial: string; confirmed: boolean; message: string }
interface Result { serialNumber?: string; status?: string }
export function BatchCapture({ onContinue, registered }: { onContinue: (draft: DeviceDraft) => void; registered: string[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  async function add(files: FileList | null) {
    if (!files?.length || busy) return;
    if (items.length + files.length > 10) { setError("Keep each batch to 10 photos. Clear completed photos to start another batch."); return; }
    setBusy(true); setError("");
    try {
      const added: Item[] = [];
      for (const file of Array.from(files)) added.push({ id: crypto.randomUUID(), photo: await imageFileToDataUrl(file), serial: "", confirmed: false, message: "Ready to read" });
      setItems(previous => [...previous, ...added]);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not add photo"); }
    finally { setBusy(false); }
  }
  async function read() {
    const pending = items.filter(i => !registered.includes(i.id) && !i.confirmed);
    if (!pending.length) return;
    setBusy(true); setError("");
    try {
      const formData = new FormData();
      for (const item of pending) formData.append("images", await dataUrlToBlob(item.photo), `${item.id}.jpg`);
      const results = await request<Result[]>("/api/ocr/serial-number/batch", { method: "POST", formData, missingMeansUnavailable: false });
      if (!Array.isArray(results) || results.length !== pending.length) throw new Error("The batch response was incomplete. Retry these photos.");
      const updates = new Map(pending.map((item, index) => [item.id, results[index]]));
      setItems(previous => previous.map(item => {
        const result = updates.get(item.id); if (!result) return item;
        return { ...item, serial: result.serialNumber ?? "", confirmed: false, message: result.status === "FAILED" ? "Could not read this photo. Retry or enter the serial manually." : result.serialNumber ? "Check the serial against the photo." : "No serial found. Enter it manually or retry." };
      }));
    } catch(e) { setError(e instanceof Error ? e.message : "Could not process batch"); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border p-5" aria-label="Batch photo capture">
    <div><h2 className="text-lg font-bold">Capture several devices</h2><p className="text-sm text-[var(--muted)]">Add up to 10 photos, read them together, then review and register each device. This queue lasts until you reload the page.</p></div>
    <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => camera.current?.click()}>Take batch photo</Button><Button variant="secondary" disabled={busy} onClick={() => gallery.current?.click()}>Choose batch photos</Button><Button disabled={busy || !items.some(i => !registered.includes(i.id) && !i.confirmed)} onClick={() => void read()}>{busy ? "Processing…" : "Read batch"}</Button><Button variant="ghost" disabled={busy} onClick={() => setItems(previous => previous.filter(i => !registered.includes(i.id)))}>Clear registered photos</Button></div>
    <input ref={camera} aria-label="Batch camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { void add(e.target.files); e.target.value = ""; }} />
    <input ref={gallery} aria-label="Batch photos" type="file" multiple accept="image/*" className="hidden" onChange={e => { void add(e.target.files); e.target.value = ""; }} />
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2">{items.map((item, index) => <article key={item.id} className="space-y-3 rounded-xl border p-3">
      <img src={item.photo} alt={`Batch photo ${index + 1}`} className="h-40 w-full rounded-lg bg-black object-contain" />
      {registered.includes(item.id) ? <p className="font-semibold text-[var(--success)]">Registered</p> : <>
      <p className="text-sm text-[var(--muted)]">{item.message}</p>
      <label className="block text-sm">Serial for photo {index + 1}<Input value={item.serial} disabled={busy} onChange={e => setItems(previous => previous.map(i => i.id === item.id ? { ...i, serial: e.target.value, confirmed: false } : i))} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy || !item.serial.trim() || !serialText.safeParse(item.serial).success} checked={item.confirmed} onChange={e => setItems(previous => previous.map(i => i.id === item.id ? { ...i, confirmed: e.target.checked } : i))} />I checked this serial against the photo.</label>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !item.confirmed} onClick={() => onContinue({ serial: item.serial.trim().toUpperCase(), captureId: item.id })}>Register photo {index + 1}</Button><Button variant="ghost" disabled={busy} onClick={() => setItems(previous => previous.filter(i => i.id !== item.id))}>Remove photo {index + 1}</Button></div>
      </>}
    </article>)}</div>
  </section>;
}
