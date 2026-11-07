"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  LayoutDashboard,
  List,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import type { DeviceDraft, DeviceFormValues } from "@/lib/domain/device";
import { useDeviceStore } from "@/hooks/use-device-store";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DeviceCapture } from "@/components/devices/device-capture";
import { DeviceDetail } from "@/components/devices/device-detail";
import { DeviceForm } from "@/components/devices/device-form";
import { DeviceInventory } from "@/components/devices/device-inventory";
import { cn } from "@/lib/utils";

type View = "dashboard" | "inventory" | "capture" | "form" | "detail";
const primaryNavigation: Array<{
  view: View;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { view: "dashboard", label: "Overview", icon: LayoutDashboard },
  { view: "capture", label: "Capture", icon: Camera },
  { view: "inventory", label: "Inventory", icon: List },
];

export function InsureItShell() {
  const store = useDeviceStore();
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeviceDraft | undefined>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  function navigate(next: View) {
    setView(next);
    setDraft(undefined);
    setMobileMenuOpen(false);
    if (next !== "detail") setSelectedId(null);
  }
  function openDevice(id: string) {
    setSelectedId(id);
    setView("detail");
  }
  function startNewFromInventory() {
    navigate("form");
  }

  async function saveDevice(values: DeviceFormValues) {
    const saved = await store.addDevice(values);
    setDraft(undefined);
    setSelectedId(saved.id);
    setView("inventory");
    showNotice(`${saved.name} registered successfully.`);
  }

  const inventoryState = {
    devices: store.devices,
    isLoading: store.isLoading,
    error: store.error,
    onRetry: store.refresh,
  };
  const renderView = () => {
    if (view === "capture")
      return (
        <DeviceCapture
          onCancel={() => navigate("dashboard")}
          onContinue={(nextDraft) => {
            setDraft(nextDraft);
            setView("form");
          }}
        />
      );
    if (view === "form")
      return (
        <DeviceForm
          draft={draft}
          onSave={saveDevice}
          onCancel={() => setView(draft ? "capture" : "inventory")}
        />
      );
    if (view === "detail" && selectedId)
      return (
        <DeviceDetail
          key={selectedId}
          deviceId={selectedId}
          onBack={() => {
            store.refresh();
            navigate("inventory");
          }}
          onChanged={store.refresh}
        />
      );
    if (view === "dashboard")
      return (
        <DashboardView
          {...inventoryState}
          onAdd={startNewFromInventory}
          onCapture={() => navigate("capture")}
          onOpenDevice={openDevice}
          onOpenInventory={() => navigate("inventory")}
        />
      );
    return (
      <DeviceInventory
        {...inventoryState}
        onOpen={openDevice}
        onAdd={startNewFromInventory}
      />
    );
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-[color:var(--surface)] p-5 lg:flex">
        <Brand />
        <nav className="mt-8 space-y-1" aria-label="Primary navigation">
          {primaryNavigation.map((item) => {
            const active =
              view === item.view ||
              (item.view === "inventory" && ["detail", "form"].includes(view));
            return (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
                )}
              >
                <item.icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            Your device records
          </p>
          <p className="mt-2 text-sm font-bold">Backend inventory</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Refresh inventory to see the latest registered devices, locations,
            and lifecycle status.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-[color:color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </Button>
              <Brand compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-[var(--muted)]">
                IT asset workspace
              </p>
              <p className="text-sm font-bold">Device lifecycle overview</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                IT assets
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {renderView()}
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-[color:var(--surface)] px-2 pt-2 lg:hidden"
        aria-label="Mobile navigation"
      >
        {primaryNavigation.map((item) => {
          const active =
            view === item.view ||
            (item.view === "inventory" && ["detail", "form"].includes(view));
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={cn(
                "focus-ring flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold",
                active ? "text-[var(--primary)]" : "text-[var(--muted)]",
              )}
            >
              <item.icon size={20} /> {item.label}
            </button>
          );
        })}
      </nav>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/55"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm border-r bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <nav className="mt-8 space-y-2">
              {primaryNavigation.map((item) => (
                <button
                  key={item.view}
                  onClick={() => navigate(item.view)}
                  className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:bg-[var(--surface-muted)]"
                >
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
              <button
                onClick={startNewFromInventory}
                className="focus-ring flex w-full items-center gap-3 rounded-xl bg-[var(--primary)] px-3 py-3 text-sm font-bold text-white"
              >
                <Plus size={18} /> Add device manually
              </button>
            </nav>
          </aside>
        </div>
      ) : null}

      <div
        aria-live="polite"
        className={cn(
          "fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm font-bold shadow-xl transition lg:bottom-6",
          notice
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {notice}
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-white shadow-sm">
        <ShieldCheck size={21} />
      </div>
      <div className={compact ? "hidden sm:block" : ""}>
        <p className="text-lg font-extrabold tracking-tight">
          Insure-<span className="font-medium">It</span>
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          IT asset management
        </p>
      </div>
    </div>
  );
}
