"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

type Check = { id: string; status: string; notes?: string | null; checkedAt: string };

type Station = {
  id: string;
  barcode: string;
  stationType: string;
  label: string | null;
  locationNotes: string | null;
  isActive: boolean;
  checks: Check[];
};

type ScanResult = {
  station: Station | null;
  barcode: string;
  isNew: boolean;
};

type RecentScan = {
  barcode: string;
  label: string | null;
  stationType: string;
  status: string;
  checkedAt: string;
};

const STATUS_OPTIONS = [
  { value: "CLEAR", label: "Clear", color: "#22c55e", desc: "No activity" },
  { value: "ACTIVITY", label: "Activity", color: "#eab308", desc: "Signs of activity" },
  { value: "TRIGGERED", label: "Triggered", color: "#ef4444", desc: "Station triggered" },
  { value: "BAIT_CONSUMED", label: "Bait Consumed", color: "#f97316", desc: "Bait fully consumed" },
  { value: "BAIT_REPLACED", label: "Bait Replaced", color: "#3b82f6", desc: "Bait replaced/refilled" },
  { value: "DAMAGED", label: "Damaged", color: "#6b7280", desc: "Station damaged" },
  { value: "REMOVED", label: "Removed", color: "#374151", desc: "Station removed" },
];

const TYPE_LABELS: Record<string, string> = {
  TERMITE: "Termite Station",
  RODENT_BAIT: "Rodent Bait Station",
  RODENT_SNAP: "Snap Trap",
  RODENT_GLUE: "Glue Board",
  RODENT_LIVE: "Live Trap",
  OTHER: "Station",
};

const TYPE_ICONS: Record<string, string> = {
  TERMITE: "🪵",
  RODENT_BAIT: "☠️",
  RODENT_SNAP: "🪤",
  RODENT_GLUE: "🟫",
  RODENT_LIVE: "📦",
  OTHER: "📍",
};

const TYPE_OPTIONS = [
  { value: "TERMITE", label: "Termite Station" },
  { value: "RODENT_BAIT", label: "Rodent Bait Station" },
  { value: "RODENT_SNAP", label: "Snap Trap" },
  { value: "RODENT_GLUE", label: "Glue Board" },
  { value: "RODENT_LIVE", label: "Live Trap" },
  { value: "OTHER", label: "Other" },
];

type Props = {
  propertyId: string;
  appointmentId?: string;
  initialStations?: Station[];
};

export function StationScanner({ propertyId, appointmentId, initialStations = [] }: Props) {
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("CLEAR");
  const [checkNotes, setCheckNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  // Register new station form
  const [registerType, setRegisterType] = useState("OTHER");
  const [registerLabel, setRegisterLabel] = useState("");
  const [registerLocation, setRegisterLocation] = useState("");
  const [registering, setRegistering] = useState(false);

  // Station list
  const [stations, setStations] = useState<Station[]>(initialStations);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scanMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  const processBarcode = useCallback(
    async (barcode: string) => {
      const code = barcode.trim();
      if (!code) return;
      setBarcodeInput("");
      setScanning(true);
      setScanResult(null);

      try {
        const res = await fetch(`/api/stations?barcode=${encodeURIComponent(code)}`);
        const data = await res.json();
        const station: Station | null = data.data;

        setScanResult({
          station,
          barcode: code,
          isNew: !station,
        });
        setSelectedStatus("CLEAR");
        setCheckNotes("");
        setRegisterLabel(code);
        setRegisterType("OTHER");
        setRegisterLocation("");
      } catch {
        toast.error("Failed to look up barcode");
      } finally {
        setScanning(false);
        if (inputRef.current) inputRef.current.focus();
      }
    },
    []
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcode(barcodeInput);
    }
  };

  const logCheck = async () => {
    if (!scanResult?.station) return;
    setLogging(true);
    try {
      const res = await fetch(`/api/stations/${scanResult.station.id}/checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          notes: checkNotes || undefined,
          appointmentId: appointmentId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();

      const statusCfg = STATUS_OPTIONS.find((s) => s.value === selectedStatus)!;
      toast.success(`${scanResult.station.label ?? scanResult.barcode} — ${statusCfg.label}`);

      setRecentScans((prev) => [
        {
          barcode: scanResult.barcode,
          label: scanResult.station!.label,
          stationType: scanResult.station!.stationType,
          status: selectedStatus,
          checkedAt: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);

      // Update local station list
      setStations((prev) =>
        prev.map((s) =>
          s.id === scanResult.station!.id
            ? {
                ...s,
                checks: [{ id: "tmp", status: selectedStatus, notes: checkNotes || null, checkedAt: new Date().toISOString() }, ...s.checks],
              }
            : s
        )
      );

      setScanResult(null);
      if (inputRef.current) inputRef.current.focus();
    } catch {
      toast.error("Failed to log check");
    } finally {
      setLogging(false);
    }
  };

  const registerStation = async () => {
    if (!scanResult) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          barcode: scanResult.barcode,
          stationType: registerType,
          label: registerLabel || undefined,
          locationNotes: registerLocation || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newStation: Station = { ...data.data, checks: [] };
      setStations((prev) => [...prev, newStation]);
      setScanResult({ station: newStation, barcode: scanResult.barcode, isNew: false });
      toast.success("Station registered — now log the check result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register station");
    } finally {
      setRegistering(false);
    }
  };

  const statusCfg = STATUS_OPTIONS.find((s) => s.value === selectedStatus);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📡</span>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Station Scanner</h3>
          {stations.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {stations.length} registered
            </span>
          )}
        </div>
        <button
          onClick={() => { setScanMode(!scanMode); setScanResult(null); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            scanMode
              ? "text-white bg-primary"
              : "border border-border hover:bg-muted"
          }`}
        >
          {scanMode ? "⏸ Pause Scanner" : "▶ Activate Scanner"}
        </button>
      </div>

      {/* Scanner input */}
      {scanMode && (
        <div className="p-4 border-b border-border bg-primary/5">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            SCAN OR ENTER BARCODE — Scanner input is active
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan station barcode or type manually…"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-primary/40 bg-background text-foreground text-sm font-mono focus:outline-none focus:border-primary"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              onClick={() => processBarcode(barcodeInput)}
              disabled={!barcodeInput.trim() || scanning}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {scanning ? "…" : "Go"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bluetooth scanner sends Enter automatically. For manual entry, type the barcode and press Enter.
          </p>
        </div>
      )}

      {/* Scan result */}
      {scanResult && (
        <div className="p-4 border-b border-border">
          {scanResult.isNew ? (
            /* Register new station */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-lg">⚠️</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Unknown Barcode</div>
                  <div className="text-xs text-muted-foreground font-mono">{scanResult.barcode}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">This barcode isn&apos;t registered yet. Fill in the details to add it to this property.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Station Type</label>
                  <select
                    value={registerType}
                    onChange={(e) => setRegisterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Label / ID</label>
                  <input
                    type="text"
                    value={registerLabel}
                    onChange={(e) => setRegisterLabel(e.target.value)}
                    placeholder="e.g. T-01 or R-North"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Location Notes</label>
                  <input
                    type="text"
                    value={registerLocation}
                    onChange={(e) => setRegisterLocation(e.target.value)}
                    placeholder="e.g. NE corner of building, near water main"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setScanResult(null)} className="px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={registerStation}
                  disabled={registering}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60"
                >
                  {registering ? "Registering…" : "Register Station"}
                </button>
              </div>
            </div>
          ) : (
            /* Log check for existing station */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                  {TYPE_ICONS[scanResult.station!.stationType] ?? "📍"}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {scanResult.station!.label ?? scanResult.barcode}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {TYPE_LABELS[scanResult.station!.stationType]} · <span className="font-mono">{scanResult.barcode}</span>
                  </div>
                  {scanResult.station!.locationNotes && (
                    <div className="text-xs text-muted-foreground mt-0.5">{scanResult.station!.locationNotes}</div>
                  )}
                </div>
              </div>

              {/* Status selector */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Check Result</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedStatus(s.value)}
                      className={`flex flex-col items-center p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                        selectedStatus === s.value ? "text-white" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                      style={selectedStatus === s.value ? { background: s.color, borderColor: s.color } : {}}
                    >
                      <span className="font-semibold">{s.label}</span>
                      <span className={`text-[10px] mt-0.5 ${selectedStatus === s.value ? "text-white/80" : "text-muted-foreground"}`}>
                        {s.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="Any additional observations…"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setScanResult(null)} className="px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={logCheck}
                  disabled={logging}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: statusCfg?.color ?? "#0ABAB5" }}
                >
                  {logging ? "Logging…" : `Log — ${statusCfg?.label}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent scans this session */}
      {recentScans.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Session</p>
          <div className="space-y-1.5">
            {recentScans.map((scan, i) => {
              const sCfg = STATUS_OPTIONS.find((s) => s.value === scan.status);
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-base">{TYPE_ICONS[scan.stationType] ?? "📍"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{scan.label ?? scan.barcode}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">{scan.barcode}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ background: sCfg?.color ?? "#6b7280" }}
                  >
                    {sCfg?.label ?? scan.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Station list (registered stations for property) */}
      {stations.length > 0 ? (
        <div className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Registered Stations ({stations.length})
          </p>
          <div className="space-y-2">
            {stations.map((station) => {
              const lastCheck = station.checks[0];
              const lastStatus = STATUS_OPTIONS.find((s) => s.value === lastCheck?.status);
              return (
                <div key={station.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="text-base shrink-0">{TYPE_ICONS[station.stationType] ?? "📍"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">
                      {station.label ?? station.barcode}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{station.barcode}</div>
                    {station.locationNotes && (
                      <div className="text-[10px] text-muted-foreground truncate">{station.locationNotes}</div>
                    )}
                  </div>
                  {lastStatus ? (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ background: lastStatus.color }}
                    >
                      {lastStatus.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground shrink-0">Not checked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : !scanMode && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <div className="text-3xl mb-2">📡</div>
          <p className="font-medium text-foreground mb-1">No stations registered yet</p>
          <p className="text-xs">Activate the scanner and scan a barcode to register and check stations.</p>
        </div>
      )}
    </div>
  );
}
