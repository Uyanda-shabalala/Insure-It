"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CloudOff, LayoutDashboard, List, Menu, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { DeviceDraft, DeviceFormValues } from "@/lib/domain/device";
import { useDeviceStore } from "@/hooks/use-device-store";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DeviceCapture } from "@/components/devices/device-capture";
import { DeviceDetail } from "@/components/devices/device-detail";
import { DeviceForm } from "@/components/devices/device-form";
import { DeviceInventory } from "@/components/devices/device-inventory";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

type View = "dashboard" | "inventory" | "capture" | "form" | "detail";

const primaryNavigation: Array<{ view: View; label: string; icon: typeof LayoutDashboard }> = [
  { view: "dashboard", label: "Overview", icon: LayoutDashboard },
  { view: "capture", label: "Capture", icon: Camera },
  { view: "inventory", label: "Inventory", icon: List },
];

export function InsureItShell() {
  const store = useDeviceStore();
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeviceDraft | undefined>();
  const [registeredCaptures, setRegisteredCaptures] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const selectedDevice = selectedId ? store.byId.get(selectedId) : undefined;

  function navigate(next: View) {
    setView(next);
    setDraft(undefined);
    setMobileMenuOpen(false);
    if (next !== "detail" && next !== "form") setSelectedId(null);
  }

  function openDevice(id: string) {
    setSelectedId(id);
    setView("detail");
  }

  function startNewFromInventory() {
    setSelectedId(null);
    setDraft(undefined);
    setView("form");
  }

  // Throws on failure: the form keeps the entered details and shows the message.
  async function saveDevice(values: DeviceFormValues) {
    const id = await store.addDevice(values);
    if (draft?.captureId) setRegisteredCaptures(previous => [...previous, draft.captureId!]);
    setDraft(undefined);
    showNotice("Device registered");
    if (id) {
      setSelectedId(id);
      setView("detail");
    } else {
      setView("inventory"); // The backend did not return the new id: show the refreshed list instead.
    }
  }

  async function onDeviceChanged(message: string) {
    await store.refresh();
    showNotice(message);
  }

  if (!store.isReady) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-xl animate-pulse space-y-4">
          <div className="h-10 w-44 rounded-xl bg-[var(--surface-muted)]" />
          <div className="h-44 rounded-3xl bg-[var(--surface-muted)]" />
          <div className="grid grid-cols-2 gap-4"><div className="h-28 rounded-2xl bg-[var(--surface-muted)]" /><div className="h-28 rounded-2xl bg-[var(--surface-muted)]" /></div>
        </div>
      </main>
    );
  }

  // First load failed and there is nothing to show: an error state is clearer than a dashboard of zeros.
  const loadFailed = Boolean(store.loadError) && !store.devices.length;

  const renderView = () => {
    if (loadFailed && (view === "dashboard" || view === "inventory")) {
      return (
        <EmptyState
          icon={CloudOff}
          title="Devices could not be loaded"
          description={store.loadError ?? "The backend did not respond."}
          actionLabel="Try again"
          onAction={() => void store.refresh()}
        />
      );
    }
    if (view === "dashboard") {
      return <DashboardView devices={store.devices} onAdd={() => navigate("capture")} onOpenDevice={openDevice} onOpenInventory={() => navigate("inventory")} />;
    }
    if (view === "inventory") {
      return <DeviceInventory devices={store.devices} onOpen={openDevice} onAdd={startNewFromInventory} />;
    }
    if (view === "capture") {
      return null;
    }
    if (view === "form") {
      return (
        <DeviceForm
          draft={draft}
          onSave={saveDevice}
          onCancel={() => setView(draft ? "capture" : "inventory")}
        />
      );
    }
    if (view === "detail" && selectedDevice) {
      return <DeviceDetail device={selectedDevice} onBack={() => navigate("inventory")} onChanged={onDeviceChanged} />;
    }
    return <DeviceInventory devices={store.devices} onOpen={openDevice} onAdd={startNewFromInventory} />;
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-[color:var(--surface)] p-5 lg:flex">
        <Brand />
        <nav className="mt-8 space-y-1" aria-label="Primary navigation">
          {primaryNavigation.map((item) => {
            const active = view === item.view || (item.view === "inventory" && ["detail", "form"].includes(view));
            return (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
                )}
              >
                <item.icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-[color:color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></Button>
              <Brand compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-bold">Asset protection overview</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {store.loadError && !loadFailed ? (
            <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between">
              <span>{store.loadError}</span>
              <Button variant="secondary" size="sm" onClick={() => void store.refresh()}><RefreshCw size={14} /> Try again</Button>
            </div>
          ) : null}
          {renderView()}
          <div hidden={view !== "capture"}>
            <DeviceCapture registered={registeredCaptures} onCancel={() => navigate("dashboard")} onContinue={capture => { setDraft(capture); setView("form"); }} />
          </div>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-[color:var(--surface)] px-2 pt-2 lg:hidden" aria-label="Mobile navigation">
        {primaryNavigation.map((item) => {
          const active = view === item.view || (item.view === "inventory" && ["detail", "form"].includes(view));
          return (
            <button key={item.view} onClick={() => navigate(item.view)} className={cn("focus-ring flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold", active ? "text-[var(--primary)]" : "text-[var(--muted)]")}>
              <item.icon size={20} /> {item.label}
            </button>
          );
        })}
      </nav>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/55" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm border-r bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between"><Brand /><Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}><X size={20} /></Button></div>
            <nav className="mt-8 space-y-2">
              {primaryNavigation.map((item) => (
                <button key={item.view} onClick={() => navigate(item.view)} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:bg-[var(--surface-muted)]">
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
              <button onClick={startNewFromInventory} className="focus-ring flex w-full items-center gap-3 rounded-xl bg-[var(--primary)] px-3 py-3 text-sm font-bold text-white"><Plus size={18} /> Add device manually</button>
            </nav>
          </aside>
        </div>
      ) : null}

      <div aria-live="polite" className={cn("fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm font-bold shadow-xl transition lg:bottom-6", notice ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
        {notice}
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-white shadow-sm"><ShieldCheck size={21} /></div>
      <div className={compact ? "hidden sm:block" : ""}>
        <p className="text-lg font-extrabold tracking-tight">Insure-<span className="font-medium">It</span></p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Asset protection</p>
      </div>
    </div>
  );
}
