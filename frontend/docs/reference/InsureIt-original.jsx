import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutGrid, Camera, List, ChevronLeft, Check, ImageIcon,
  Laptop, Monitor, Tablet, Smartphone, Watch, Tv, Aperture, Box,
  Pencil, Trash2, Plus, Search, Download, X, AlertCircle
} from "lucide-react";

const DEVICE_TYPES = ["Laptop", "Desktop", "Tablet", "Smartphone", "Smartwatch", "TV", "Camera", "Other"];
const INSURERS = ["Outsurance", "Hollard", "Discovery", "Santam", "King Price", "Momentum", "Other"];

const TYPE_ICONS = {
  Laptop, Desktop: Monitor, Tablet, Smartphone, Smartwatch: Watch, TV: Tv, Camera: Aperture, Other: Box
};

const seedDevices = [
  { id: "d1", name: 'MacBook Pro 14"', type: "Laptop", serial: "A1B2-C3D4", insurer: "Outsurance", policyNumber: "OUT-2024-8821", expiryDate: "2026-12-31", premium: 189, sumInsured: 32000, photo: null, claims: [], addedAt: Date.now() - 86400000 },
  { id: "d2", name: "Dell XPS 15", type: "Laptop", serial: "X5Y6-Z7W8", insurer: "Hollard", policyNumber: "HOL-2024-4471", expiryDate: "2026-08-10", premium: 145, sumInsured: 24000, photo: null, claims: [
    { id: "c1", date: "2026-03-02", description: "Cracked screen repair", amount: 3200 },
  ], addedAt: Date.now() - 3 * 86400000 },
  { id: "d3", name: "iPad Pro", type: "Tablet", serial: "P9Q0-R1S2", insurer: "Discovery", policyNumber: "DIS-2024-2290", expiryDate: "2027-03-15", premium: 79, sumInsured: 15000, photo: null, claims: [], addedAt: Date.now() - 4 * 86400000 },
  { id: "d4", name: 'iMac 24"', type: "Desktop", serial: "M3N4-O5P6", insurer: "Outsurance", policyNumber: "OUT-2024-1123", expiryDate: "2027-01-20", premium: 165, sumInsured: 21000, photo: null, claims: [], addedAt: Date.now() - 2 * 86400000 },
];

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const diffDays = (new Date(dateStr) - new Date()) / 86400000;
  return diffDays >= 0 && diffDays <= 90;
}
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "Added today";
  if (days === 1) return "Added yesterday";
  return `Added ${days} days ago`;
}
function genSerial() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}
function formatCurrency(n) {
  if (n === "" || n === null || n === undefined || isNaN(n)) return "—";
  return "R " + Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 2 });
}
function csvEscape(val) {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCSV(devices) {
  const headers = ["Name", "Type", "Serial", "Insurer", "Policy Number", "Monthly Premium (R)", "Sum Insured (R)", "Expiry Date", "Status"];
  const rows = devices.map((d) => [
    d.name, d.type, d.serial || "", d.insurer, d.policyNumber || "",
    d.premium ?? "", d.sumInsured ?? "", d.expiryDate || "",
    isExpiringSoon(d.expiryDate) ? "Expiring" : "Active",
  ]);
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "insure-it-devices.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function TypeIcon({ type, size = 18, className = "" }) {
  const Icon = TYPE_ICONS[type] || Box;
  return <Icon size={size} className={className} />;
}

function Badge({ expiring }) {
  return (
    <span
      className={
        "text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap " +
        (expiring ? "bg-orange-500/10 text-orange-400" : "bg-green-500/10 text-green-400")
      }
    >
      {expiring ? "Expiring" : "Active"}
    </span>
  );
}

export default function InsureItApp() {
  const [devices, setDevices] = useState(seedDevices);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("dashboard");
  const [tab, setTab] = useState("dashboard");
  const [draftPhoto, setDraftPhoto] = useState(null);
  const [draftSerial, setDraftSerial] = useState("");
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    type: "", customType: "", name: "", serial: "", insurer: "", customInsurer: "",
    policyNumber: "", expiryDate: "", premium: "", sumInsured: "", photo: null,
  });

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get("insureit:devices", false);
        if (!cancelled && res && res.value) {
          setDevices(JSON.parse(res.value));
        }
      } catch (e) {
        // no saved data yet, keep seed
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("insureit:devices", JSON.stringify(devices), false);
      } catch (e) {
        console.error("save failed", e);
      }
    })();
  }, [devices, loaded]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  function goTab(t) {
    setDraftPhoto(null);
    setDraftSerial("");
    setEditingDevice(null);
    setTab(t);
    setScreen(t === "dashboard" ? "dashboard" : t === "capture" ? "capture" : "inventory");
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setDraftPhoto(e.target.result);
      setDraftSerial(genSerial());
      setScreen("ocr");
    };
    reader.readAsDataURL(file);
  }

  function startNewDeviceFlow(serial, photo) {
    setEditingDevice(null);
    setForm({
      type: "", customType: "", name: "", serial: serial || "", insurer: "", customInsurer: "",
      policyNumber: "", expiryDate: "", premium: "", sumInsured: "", photo: photo || null,
    });
    setScreen("details");
  }

  function startEditFlow(device) {
    setEditingDevice(device);
    const typeIsKnown = DEVICE_TYPES.includes(device.type);
    const insurerIsKnown = INSURERS.includes(device.insurer);
    setForm({
      type: typeIsKnown ? device.type : "Other",
      customType: typeIsKnown ? "" : device.type,
      name: device.name,
      serial: device.serial || "",
      insurer: insurerIsKnown ? device.insurer : "Other",
      customInsurer: insurerIsKnown ? "" : device.insurer,
      policyNumber: device.policyNumber || "",
      expiryDate: device.expiryDate || "",
      premium: device.premium ?? "",
      sumInsured: device.sumInsured ?? "",
      photo: device.photo || null,
    });
    setScreen("details");
  }

  function saveDevice(data) {
    const finalType = data.type === "Other" ? (data.customType.trim() || "Other") : data.type;
    const finalInsurer = data.insurer === "Other" ? (data.customInsurer.trim() || "Other") : data.insurer;

    if (editingDevice) {
      setDevices((prev) => prev.map((d) => (
        d.id === editingDevice.id
          ? {
              ...d,
              type: finalType,
              name: data.name.trim(),
              serial: data.serial.trim(),
              insurer: finalInsurer,
              policyNumber: data.policyNumber.trim(),
              expiryDate: data.expiryDate,
              premium: data.premium === "" ? null : Number(data.premium),
              sumInsured: data.sumInsured === "" ? null : Number(data.sumInsured),
              photo: data.photo,
            }
          : d
      )));
      showToast("Device updated");
      setSelectedId(editingDevice.id);
      setTab("inventory");
      setScreen("record");
      setEditingDevice(null);
    } else {
      const newDevice = {
        id: "d" + Date.now(),
        type: finalType,
        name: data.name.trim(),
        serial: data.serial.trim(),
        insurer: finalInsurer,
        policyNumber: data.policyNumber.trim(),
        expiryDate: data.expiryDate,
        premium: data.premium === "" ? null : Number(data.premium),
        sumInsured: data.sumInsured === "" ? null : Number(data.sumInsured),
        photo: data.photo,
        claims: [],
        addedAt: Date.now(),
      };
      setDevices((prev) => [newDevice, ...prev]);
      showToast("Device saved");
      setDraftPhoto(null);
      setDraftSerial("");
      goTab("dashboard");
    }
  }

  function removeDevice(id) {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    showToast("Device removed");
    setTab("inventory");
    setScreen("inventory");
  }

  function addClaim(deviceId, claim) {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, claims: [claim, ...(d.claims || [])] } : d)));
    showToast("Claim added");
  }

  function removeClaim(deviceId, claimId) {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, claims: (d.claims || []).filter((c) => c.id !== claimId) } : d)));
  }

  // Derived
  const total = devices.length;
  const expiringCount = devices.filter((d) => isExpiringSoon(d.expiryDate)).length;
  const activeCoverCount = devices.filter((d) => !isExpiringSoon(d.expiryDate)).length;
  const insurersCount = new Set(devices.map((d) => d.insurer)).size;
  const totalPremium = devices.reduce((sum, d) => sum + (Number(d.premium) || 0), 0);
  const totalSumInsured = devices.reduce((sum, d) => sum + (Number(d.sumInsured) || 0), 0);
  const recent = [...devices].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3);

  let filteredDevices = devices.filter((d) => {
    const f = search.trim().toLowerCase();
    const matchesSearch = !f ||
      d.name.toLowerCase().includes(f) ||
      (d.serial || "").toLowerCase().includes(f) ||
      d.insurer.toLowerCase().includes(f);
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "expiring" && isExpiringSoon(d.expiryDate)) ||
      (filterStatus === "active" && !isExpiringSoon(d.expiryDate));
    return matchesSearch && matchesFilter;
  });
  filteredDevices = filteredDevices.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "expiry") return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
    if (sortBy === "insurer") return a.insurer.localeCompare(b.insurer);
    return b.addedAt - a.addedAt; // recent
  });

  const selectedDevice = devices.find((d) => d.id === selectedId) || null;

  const headerMap = {
    dashboard: { title: "Overview", back: null },
    capture: { title: "Capture device", back: null },
    ocr: { title: "Review serial number", back: { label: "Retake", action: () => setScreen("capture") } },
    details: {
      title: "Device details",
      back: {
        label: editingDevice ? "Cancel" : "Back",
        action: () => (editingDevice ? setScreen("record") : setScreen("ocr")),
      },
    },
    inventory: { title: "My devices", back: null },
    record: { title: "Device record", back: { label: "Inventory", action: () => setScreen("inventory") } },
  };
  const currentHeader = headerMap[screen];

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center bg-gray-950 py-6">
      <div
        className="max-w-full max-h-screen bg-gray-950 overflow-hidden relative flex flex-col shadow-2xl ring-8 ring-black"
        style={{ width: 390, height: 780, borderRadius: 40 }}
      >
        <div className="flex justify-between items-center px-6 pt-3.5 pb-1 text-xs font-semibold text-white bg-gradient-to-br from-purple-500 to-indigo-600">
          <span>9:41</span>
          <span>100%</span>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 px-6 pb-4 pt-0.5">
          <div
            className={"flex items-center gap-1.5 h-5 mb-1 text-sm font-medium text-white/90 cursor-pointer " + (currentHeader.back ? "visible" : "invisible")}
            onClick={currentHeader.back ? currentHeader.back.action : undefined}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            <span>{currentHeader.back ? currentHeader.back.label : "Back"}</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white m-0">
            Insure-<span className="font-normal opacity-95">It</span>
          </h1>
          <p className="text-sm text-white/85 font-medium mt-0.5">{currentHeader.title}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3 text-gray-100 [scrollbar-width:none] [-ms-overflow-style:none]">
          {screen === "dashboard" && (
            <Dashboard
              total={total}
              expiringCount={expiringCount}
              activeCoverCount={activeCoverCount}
              insurersCount={insurersCount}
              totalPremium={totalPremium}
              totalSumInsured={totalSumInsured}
              recent={recent}
              onAddDevice={() => goTab("capture")}
            />
          )}

          {screen === "capture" && (
            <CaptureScreen
              onTap={() => cameraInputRef.current && cameraInputRef.current.click()}
              onGallery={() => galleryInputRef.current && galleryInputRef.current.click()}
            />
          )}

          {screen === "ocr" && (
            <OcrReview
              photo={draftPhoto}
              serial={draftSerial}
              onSerialChange={setDraftSerial}
              onConfirm={() => {
                if (!draftSerial.trim()) {
                  showToast("Enter a serial number first");
                  return;
                }
                startNewDeviceFlow(draftSerial, draftPhoto);
              }}
              onRetake={() => setScreen("capture")}
            />
          )}

          {screen === "details" && (
            <DeviceDetailsForm
              initialForm={form}
              editing={!!editingDevice}
              onSave={(data) => saveDevice(data)}
              onCancel={() => (editingDevice ? setScreen("record") : setScreen("ocr"))}
            />
          )}

          {screen === "inventory" && (
            <InventoryList
              devices={filteredDevices}
              totalCount={devices.length}
              search={search}
              setSearch={setSearch}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              onSelect={(id) => {
                setSelectedId(id);
                setScreen("record");
              }}
              onExport={() => downloadCSV(devices)}
            />
          )}

          {screen === "record" && selectedDevice && (
            <DeviceRecord
              device={selectedDevice}
              onEdit={() => startEditFlow(selectedDevice)}
              onRemove={() => removeDevice(selectedDevice.id)}
              onAddClaim={(claim) => addClaim(selectedDevice.id, claim)}
              onRemoveClaim={(claimId) => removeClaim(selectedDevice.id, claimId)}
            />
          )}
        </div>

        <div
          className={
            "absolute left-5 right-5 bottom-24 bg-gray-800 border border-purple-500 text-white text-sm font-semibold px-4 py-3 rounded-xl text-center shadow-xl transition-all duration-300 z-20 " +
            (toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none")
          }
        >
          {toast}
        </div>

        <div className="flex border-t border-gray-800 bg-gray-900 pt-2 pb-2.5">
          <NavItem icon={LayoutGrid} label="Dashboard" active={tab === "dashboard"} onClick={() => goTab("dashboard")} />
          <NavItem icon={Camera} label="Capture" active={tab === "capture"} onClick={() => goTab("capture")} />
          <NavItem icon={List} label="Inventory" active={tab === "inventory"} onClick={() => goTab("inventory")} />
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <div
      className={"flex-1 flex flex-col items-center gap-0.5 text-xs font-semibold cursor-pointer " + (active ? "text-purple-400" : "text-gray-500")}
      onClick={onClick}
    >
      <Icon size={20} />
      {label}
    </div>
  );
}

function Dashboard({ total, expiringCount, activeCoverCount, insurersCount, totalPremium, totalSumInsured, recent, onAddDevice }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={total} label="Total devices" color="text-purple-300" />
        <StatCard value={expiringCount} label="Expiring soon" color="text-orange-400" />
        <StatCard value={activeCoverCount} label="Active cover" color="text-green-400" />
        <StatCard value={insurersCount} label="Insurers" color="text-purple-300" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mt-3 flex justify-between">
        <div>
          <div className="text-lg font-extrabold text-purple-300">{formatCurrency(totalPremium)}</div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">Monthly premiums</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-purple-300">{formatCurrency(totalSumInsured)}</div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">Total sum insured</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 font-semibold mt-5 mb-2">Recent activity</div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        {recent.length ? (
          recent.map((d, i) => (
            <div key={d.id} className={"flex items-center gap-3 py-2.5 " + (i !== recent.length - 1 ? "border-b border-gray-800" : "")}>
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-purple-400 flex-shrink-0 overflow-hidden">
                {d.photo ? <img src={d.photo} alt="" className="w-full h-full object-cover" /> : <TypeIcon type={d.type} size={18} />}
              </div>
              <div>
                <div className="font-bold text-sm">{d.name}</div>
                <div className="text-xs text-gray-500">{timeAgo(d.addedAt)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 text-sm py-14">No devices yet. Add your first one below.</div>
        )}
      </div>

      <button
        className="w-full mt-5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl py-3.5 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        onClick={onAddDevice}
      >
        <Plus size={18} /> Add new device
      </button>
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className={"text-2xl font-extrabold " + color}>{value}</div>
      <div className="text-xs text-gray-500 font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function CaptureScreen({ onTap, onGallery }) {
  return (
    <div>
      <div
        className="bg-gray-800/60 border-2 border-dashed border-purple-900 rounded-2xl py-10 px-5 text-center cursor-pointer text-purple-400 font-semibold text-sm hover:bg-gray-800 hover:border-purple-500 transition-colors"
        onClick={onTap}
      >
        <Camera size={34} className="mx-auto mb-2.5" />
        Tap to photograph serial
      </div>

      <div className="text-xs text-gray-500 font-semibold mt-5 mb-2">Or upload from gallery</div>
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer hover:border-purple-500 transition-colors"
        onClick={onGallery}
      >
        <ImageIcon size={16} /> Choose image
      </div>

      <button
        className="w-full mt-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl py-3.5 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        onClick={onTap}
      >
        <Camera size={18} /> Open camera
      </button>
    </div>
  );
}

function OcrReview({ photo, serial, onSerialChange, onConfirm, onRetake }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-semibold mb-2">Photo captured</div>
      <div className="bg-gray-800 border border-gray-800 rounded-2xl h-32 flex items-center justify-center overflow-hidden mb-4">
        {photo ? <img src={photo} alt="Captured serial" className="w-full h-full object-cover" /> : <ImageIcon size={36} className="text-gray-600" />}
      </div>

      <div className="text-xs text-gray-500 font-semibold mb-2">Claude AI extracted</div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3.5 mb-4">
        <div className="text-xs text-purple-400 font-bold mb-1">Serial number</div>
        <div className="text-lg font-bold tracking-wide">{serial || "—"}</div>
        <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold mt-2">
          <Check size={13} /> Extracted via Claude API
        </div>
      </div>

      <div className="text-xs text-gray-500 font-semibold mb-2">Not correct? Edit below</div>
      <input
        type="text"
        value={serial}
        onChange={(e) => onSerialChange(e.target.value)}
        placeholder="Enter serial number"
        className="w-full bg-gray-800 border border-gray-800 text-gray-100 rounded-xl px-3.5 py-3 text-sm outline-none focus:border-purple-500"
      />

      <button
        className="w-full mt-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl py-3.5 text-base font-bold active:scale-[0.98] transition-transform"
        onClick={onConfirm}
      >
        Confirm serial number
      </button>
      <button
        className="w-full mt-2.5 bg-gray-800 border border-gray-800 text-gray-100 rounded-2xl py-3.5 text-sm font-semibold"
        onClick={onRetake}
      >
        Retake photo
      </button>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="block text-xs text-gray-500 font-semibold mt-3.5 mb-1.5">{children}</label>;
}
function ErrorText({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-red-400 font-semibold mt-1">
      <AlertCircle size={12} /> {children}
    </div>
  );
}
function fieldClass(hasError) {
  return (
    "w-full bg-gray-800 border text-gray-100 rounded-xl px-3.5 py-3 text-sm outline-none " +
    (hasError ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-purple-500")
  );
}

function DeviceDetailsForm({ initialForm, onSave, onCancel, editing }) {
  const [f, setF] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const photoInputRef = useRef(null);

  function update(key, value) {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  }

  function handlePhotoPick(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => update("photo", e.target.result);
    reader.readAsDataURL(file);
  }

  function validateAndSave() {
    const errs = {};
    if (!f.type) errs.type = "Select a device type";
    else if (f.type === "Other" && !f.customType.trim()) errs.customType = "Enter the device type";
    if (!f.name.trim()) errs.name = "Enter a device name";
    if (!f.insurer) errs.insurer = "Select an insurer";
    else if (f.insurer === "Other" && !f.customInsurer.trim()) errs.customInsurer = "Enter the insurer name";
    if (!f.expiryDate) errs.expiryDate = "Select a cover expiry date";
    if (f.premium !== "" && Number(f.premium) < 0) errs.premium = "Premium can't be negative";
    if (f.sumInsured !== "" && Number(f.sumInsured) < 0) errs.sumInsured = "Amount can't be negative";

    setErrors(errs);
    if (Object.keys(errs).length === 0) onSave(f);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-16 h-16 rounded-xl bg-gray-800 border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-gray-600" />}
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-purple-400 border border-purple-500/30 bg-purple-500/10 rounded-lg px-3 py-2"
          onClick={() => photoInputRef.current && photoInputRef.current.click()}
        >
          {f.photo ? "Change photo" : "Add photo"}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhotoPick(e.target.files[0])}
        />
      </div>

      <FieldLabel>Device type</FieldLabel>
      <select className={fieldClass(errors.type)} value={f.type} onChange={(e) => update("type", e.target.value)}>
        <option value="" disabled>Select type...</option>
        {DEVICE_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <ErrorText>{errors.type}</ErrorText>
      {f.type === "Other" && (
        <>
          <input
            className={fieldClass(errors.customType) + " mt-2"}
            type="text"
            placeholder="Specify device type"
            value={f.customType}
            onChange={(e) => update("customType", e.target.value)}
          />
          <ErrorText>{errors.customType}</ErrorText>
        </>
      )}

      <FieldLabel>Device name</FieldLabel>
      <input className={fieldClass(errors.name)} type="text" placeholder='e.g. MacBook Pro 14"' value={f.name} onChange={(e) => update("name", e.target.value)} />
      <ErrorText>{errors.name}</ErrorText>

      <FieldLabel>Serial number</FieldLabel>
      <input className={fieldClass()} type="text" placeholder="Serial number" value={f.serial} onChange={(e) => update("serial", e.target.value)} />

      <FieldLabel>Insurance provider</FieldLabel>
      <select className={fieldClass(errors.insurer)} value={f.insurer} onChange={(e) => update("insurer", e.target.value)}>
        <option value="" disabled>Select insurer...</option>
        {INSURERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <ErrorText>{errors.insurer}</ErrorText>
      {f.insurer === "Other" && (
        <>
          <input
            className={fieldClass(errors.customInsurer) + " mt-2"}
            type="text"
            placeholder="Specify insurer"
            value={f.customInsurer}
            onChange={(e) => update("customInsurer", e.target.value)}
          />
          <ErrorText>{errors.customInsurer}</ErrorText>
        </>
      )}

      <FieldLabel>Policy number</FieldLabel>
      <input className={fieldClass()} type="text" placeholder="Policy number" value={f.policyNumber} onChange={(e) => update("policyNumber", e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Monthly premium (R)</FieldLabel>
          <input className={fieldClass(errors.premium)} type="number" min="0" step="0.01" placeholder="e.g. 150" value={f.premium} onChange={(e) => update("premium", e.target.value)} />
          <ErrorText>{errors.premium}</ErrorText>
        </div>
        <div>
          <FieldLabel>Sum insured (R)</FieldLabel>
          <input className={fieldClass(errors.sumInsured)} type="number" min="0" step="1" placeholder="e.g. 25000" value={f.sumInsured} onChange={(e) => update("sumInsured", e.target.value)} />
          <ErrorText>{errors.sumInsured}</ErrorText>
        </div>
      </div>

      <FieldLabel>Cover expiry date</FieldLabel>
      <input className={fieldClass(errors.expiryDate)} type="date" value={f.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} />
      <ErrorText>{errors.expiryDate}</ErrorText>

      <button
        className="w-full mt-5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl py-3.5 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        onClick={validateAndSave}
      >
        <Check size={18} /> Save device
      </button>
      {editing && (
        <button className="w-full mt-2.5 bg-gray-800 border border-gray-800 text-gray-100 rounded-2xl py-3 text-sm font-semibold" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}

function InventoryList({ devices, totalCount, search, setSearch, sortBy, setSortBy, filterStatus, setFilterStatus, onSelect, onExport }) {
  const chips = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "expiring", label: "Expiring" },
  ];
  return (
    <div>
      <div className="relative mb-2.5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={fieldClass() + " pl-9"}
        />
      </div>

      <div className="flex items-center gap-2 mb-2.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilterStatus(c.key)}
            className={
              "text-xs font-bold px-3 py-1.5 rounded-full border transition-colors " +
              (filterStatus === c.key
                ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                : "bg-gray-900 border-gray-800 text-gray-500")
            }
          >
            {c.label}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="ml-auto bg-gray-900 border border-gray-800 text-gray-300 text-xs font-semibold rounded-full px-3 py-1.5 outline-none"
        >
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="expiry">Expiry soonest</option>
          <option value="insurer">Insurer</option>
        </select>
      </div>

      {totalCount > 0 && (
        <button
          onClick={onExport}
          className="w-full mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-xl py-2.5"
        >
          <Download size={15} /> Export CSV
        </button>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-3.5">
        {devices.length ? (
          devices.map((d, i) => (
            <div
              key={d.id}
              className={"flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-800/60 rounded-xl px-1 " + (i !== devices.length - 1 ? "border-b border-gray-800" : "")}
              onClick={() => onSelect(d.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-purple-400 flex-shrink-0 overflow-hidden">
                {d.photo ? <img src={d.photo} alt="" className="w-full h-full object-cover" /> : <TypeIcon type={d.type} size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{d.name}</div>
                <div className="text-xs text-gray-500 truncate">{d.serial || "—"} · {d.insurer}</div>
              </div>
              <Badge expiring={isExpiringSoon(d.expiryDate)} />
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 text-sm py-14">No devices match your filters.</div>
        )}
      </div>
    </div>
  );
}

function DeviceRecord({ device, onEdit, onRemove, onAddClaim, onRemoveClaim }) {
  const expiring = isExpiringSoon(device.expiryDate);
  const [confirming, setConfirming] = useState(false);
  const [addingClaim, setAddingClaim] = useState(false);
  const [claimDraft, setClaimDraft] = useState({ date: "", description: "", amount: "" });
  const claims = device.claims || [];

  function submitClaim() {
    if (!claimDraft.date || !claimDraft.description.trim()) return;
    onAddClaim({
      id: "c" + Date.now(),
      date: claimDraft.date,
      description: claimDraft.description.trim(),
      amount: claimDraft.amount === "" ? null : Number(claimDraft.amount),
    });
    setClaimDraft({ date: "", description: "", amount: "" });
    setAddingClaim(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-purple-400 overflow-hidden flex-shrink-0">
          {device.photo ? <img src={device.photo} alt="" className="w-full h-full object-cover" /> : <TypeIcon type={device.type} size={24} />}
        </div>
        <div>
          <div className="text-lg font-extrabold">{device.name}</div>
          <div className="mt-1 inline-block"><Badge expiring={expiring} /></div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <RecordItem k="Type" v={device.type} />
        <RecordItem k="Serial" v={device.serial || "—"} />
        <RecordItem k="Insurer" v={device.insurer} />
        <RecordItem k="Policy no." v={device.policyNumber || "—"} />
        <RecordItem k="Monthly premium" v={formatCurrency(device.premium)} />
        <RecordItem k="Sum insured" v={formatCurrency(device.sumInsured)} />
        <RecordItem k="Expires" v={fmtDate(device.expiryDate)} last />
      </div>

      <div className="flex items-center justify-between mt-5 mb-2">
        <div className="text-xs text-gray-500 font-semibold">Claims history</div>
        {!addingClaim && (
          <button className="text-xs font-bold text-purple-400" onClick={() => setAddingClaim(true)}>
            + Add claim
          </button>
        )}
      </div>

      {addingClaim && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 mb-3">
          <input
            type="date"
            className={fieldClass() + " mb-2"}
            value={claimDraft.date}
            onChange={(e) => setClaimDraft((p) => ({ ...p, date: e.target.value }))}
          />
          <input
            type="text"
            placeholder="What happened?"
            className={fieldClass() + " mb-2"}
            value={claimDraft.description}
            onChange={(e) => setClaimDraft((p) => ({ ...p, description: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="Payout amount (R)"
            className={fieldClass() + " mb-3"}
            value={claimDraft.amount}
            onChange={(e) => setClaimDraft((p) => ({ ...p, amount: e.target.value }))}
          />
          <div className="flex gap-2">
            <button className="flex-1 bg-gray-800 border border-gray-800 text-gray-100 rounded-xl py-2.5 text-sm font-semibold" onClick={() => setAddingClaim(false)}>
              Cancel
            </button>
            <button className="flex-1 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold" onClick={submitClaim}>
              Save claim
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-2">
        {claims.length ? (
          claims.map((c, i) => (
            <div key={c.id} className={"flex items-start justify-between gap-2 py-2.5 " + (i !== claims.length - 1 ? "border-b border-gray-800" : "")}>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{c.description}</div>
                <div className="text-xs text-gray-500">{fmtDate(c.date)} · {formatCurrency(c.amount)}</div>
              </div>
              <button className="text-gray-600 hover:text-red-400 flex-shrink-0 mt-0.5" onClick={() => onRemoveClaim(c.id)}>
                <X size={15} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 text-sm py-6">No claims logged for this device.</div>
        )}
      </div>

      <button
        className="w-full mt-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl py-3.5 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        onClick={onEdit}
      >
        <Pencil size={18} /> Edit record
      </button>

      {!confirming ? (
        <button
          className="w-full mt-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2"
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={16} /> Remove device
        </button>
      ) : (
        <div className="mt-2.5 bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5">
          <div className="text-sm font-semibold text-red-300 mb-3 text-center">Remove {device.name}? This can't be undone.</div>
          <div className="flex gap-2">
            <button className="flex-1 bg-gray-800 border border-gray-800 text-gray-100 rounded-xl py-2.5 text-sm font-semibold" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordItem({ k, v, last }) {
  return (
    <div className={"flex justify-between py-2.5 text-sm " + (last ? "" : "border-b border-gray-800")}>
      <span className="text-gray-500">{k}</span>
      <span className="font-bold">{v}</span>
    </div>
  );
}
