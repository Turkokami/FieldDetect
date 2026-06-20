"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, MapPin, Dog, User, AlertTriangle, CheckCircle2,
  Camera, Plus, X, ChevronRight, Clock, Trash2, ArrowRight, PenLine,
} from "lucide-react";
import { format } from "date-fns";
import { useUploadThing } from "@/lib/uploadthing-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Photo = { id: string; url: string; filename: string };
type InspUnit = {
  id: string;
  unitNumber: string;
  detectionResult: string | null;
  technicianNotes: string | null;
  alertLocation: string | null;
  photos: Photo[];
};
type PUnit = { id: string; unitNumber: string };
type Building = { id: string; name: string; units: PUnit[] };
type Property = {
  id: string; name: string;
  addressLine1: string; city: string; state: string; zip: string | null;
  buildings: Building[]; units: PUnit[];
};
type Customer = {
  id: string; firstName: string; lastName: string;
  companyName: string | null; phone: string | null; email: string | null;
};
type Inspection = { id: string; inspectionUnits: InspUnit[] };
type K9Dog = { id: string; name: string; breed: string | null };
type Member = { isPrimary: boolean; user: { firstName: string; lastName: string } };
type K9Team = { id: string; name: string; dogs: K9Dog[]; members: Member[] } | null;

export type TechAppointment = {
  id: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  accessNotes: string | null;
  specialInstructions: string | null;
  customer: Customer;
  property: Property;
  technician: { firstName: string; lastName: string } | null;
  k9Team: K9Team;
  inspection: Inspection | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RESULTS = [
  { value: "NEGATIVE",            label: "Negative",     emoji: "✅", color: "#22c55e", bg: "#052e16" },
  { value: "POSITIVE_K9_ALERT",   label: "K9 Alert",     emoji: "🚨", color: "#ef4444", bg: "#1c0a0a" },
  { value: "VISUAL_CONFIRMATION", label: "Visual +",     emoji: "👁️", color: "#dc2626", bg: "#2a0a0a" },
  { value: "INCONCLUSIVE",        label: "Inconclusive", emoji: "❓", color: "#eab308", bg: "#1c1a00" },
  { value: "UNABLE_TO_INSPECT",   label: "No Access",    emoji: "🚫", color: "#64748b", bg: "#0f172a" },
  { value: "ACCESS_DENIED",       label: "Denied",       emoji: "⛔", color: "#f97316", bg: "#1c0f00" },
  { value: "FOLLOW_UP_REQUIRED",  label: "Follow-Up",    emoji: "📋", color: "#3b82f6", bg: "#0a1628" },
];
const RESULT_MAP = Object.fromEntries(RESULTS.map((r) => [r.value, r]));

const ALERT_RESULTS = new Set(["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"]);

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function worstResult(units: InspUnit[]): string | null {
  if (!units.length) return null;
  if (units.some((u) => u.detectionResult === "POSITIVE_K9_ALERT")) return "POSITIVE_K9_ALERT";
  if (units.some((u) => u.detectionResult === "VISUAL_CONFIRMATION")) return "VISUAL_CONFIRMATION";
  if (units.some((u) => u.detectionResult === "INCONCLUSIVE")) return "INCONCLUSIVE";
  if (units.some((u) => u.detectionResult === "FOLLOW_UP_REQUIRED")) return "FOLLOW_UP_REQUIRED";
  if (units.some((u) => u.detectionResult === "ACCESS_DENIED")) return "ACCESS_DENIED";
  if (units.some((u) => u.detectionResult === "UNABLE_TO_INSPECT")) return "UNABLE_TO_INSPECT";
  if (units.every((u) => u.detectionResult === "NEGATIVE")) return "NEGATIVE";
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function UnitTile({
  unit, inspUnits, onSelect,
}: {
  unit: PUnit; inspUnits: InspUnit[]; onSelect: () => void;
}) {
  const result = worstResult(inspUnits);
  const cfg = result ? RESULT_MAP[result] : null;
  const photoCount = inspUnits.reduce((s, u) => s + u.photos.length, 0);

  return (
    <button
      onClick={onSelect}
      className="relative aspect-square rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-2 px-0.5"
      style={
        cfg
          ? { borderColor: cfg.color, background: `${cfg.color}18`, color: cfg.color }
          : { borderColor: "transparent", background: "rgba(255,255,255,0.05)", color: "inherit" }
      }
    >
      <span className="text-center leading-tight">{unit.unitNumber}</span>
      {cfg && <span className="text-[10px]">{cfg.emoji}</span>}
      {photoCount > 0 && (
        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">
          {photoCount}
        </span>
      )}
      {inspUnits.length > 1 && (
        <span className="absolute bottom-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-purple-500 text-[8px] text-white flex items-center justify-center font-bold">
          {inspUnits.length}
        </span>
      )}
    </button>
  );
}

// ─── Unit Editor (full-screen overlay) ───────────────────────────────────────

type LocalDetection = {
  key: string; // temp id for list rendering
  inspUnitId: string | null;
  unitNumber: string; // "Unit-5", "Unit-5 ·2", etc.
  result: string;
  location: string;
  notes: string;
  photos: Photo[];
};

function UnitEditor({
  baseUnitNumber,
  inspectionId,
  existingUnits,
  onClose,
  onSaved,
  onNext,
  hasNext,
}: {
  baseUnitNumber: string;
  inspectionId: string;
  existingUnits: InspUnit[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNext: () => void;
  hasNext: boolean;
}) {
  const { startUpload } = useUploadThing("inspectionPhoto");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetIdx, setPhotoTargetIdx] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const buildDetections = useCallback((): LocalDetection[] => {
    if (existingUnits.length === 0) {
      return [{
        key: "new-0", inspUnitId: null, unitNumber: baseUnitNumber,
        result: "NEGATIVE", location: "", notes: "", photos: [],
      }];
    }
    const sorted = [...existingUnits].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber));
    return sorted.map((u, i) => ({
      key: u.id,
      inspUnitId: u.id,
      unitNumber: u.unitNumber,
      result: u.detectionResult ?? "NEGATIVE",
      location: u.alertLocation ?? "",
      notes: u.technicianNotes ?? "",
      photos: u.photos,
    }));
  }, [existingUnits, baseUnitNumber]);

  const [detections, setDetections] = useState<LocalDetection[]>(buildDetections);

  const updateDetection = (idx: number, patch: Partial<LocalDetection>) => {
    setDetections((prev) => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const addDetection = () => {
    const suffix = detections.length + 1;
    setDetections((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        inspUnitId: null,
        unitNumber: `${baseUnitNumber} ·${suffix}`,
        result: "NEGATIVE",
        location: "",
        notes: "",
        photos: [],
      },
    ]);
  };

  const removeDetection = (idx: number) => {
    if (detections.length === 1) return;
    setDetections((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const det of detections) {
        if (det.inspUnitId) {
          await fetch(`/api/inspection-units/${det.inspUnitId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              detectionResult: det.result,
              alertLocation: det.location || null,
              technicianNotes: det.notes || null,
            }),
          });
        } else {
          await fetch(`/api/inspections/${inspectionId}/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              units: [{
                unitNumber: det.unitNumber,
                detectionResult: det.result,
                alertLocation: det.location || null,
                technicianNotes: det.notes || null,
              }],
            }),
          });
        }
      }
      // Delete any existing units that were removed (inspUnitIds not in current detections)
      const keptIds = new Set(detections.map((d) => d.inspUnitId).filter(Boolean));
      for (const eu of existingUnits) {
        if (!keptIds.has(eu.id)) {
          await fetch(`/api/inspection-units/${eu.id}`, { method: "DELETE" });
        }
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const det = detections[photoTargetIdx];
    if (!det.inspUnitId) {
      alert("Save the detection result first, then add photos.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]) return;
      const { ufsUrl, key, name } = uploaded[0];
      await fetch(`/api/inspection-units/${det.inspUnitId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ufsUrl, key, filename: name }),
      });
      await onSaved();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deletePhoto = async (photoId: string, unitId: string) => {
    await fetch(`/api/inspection-units/${unitId}/photos?photoId=${photoId}`, { method: "DELETE" });
    await onSaved();
  };

  // Merge fresh photo data from onSaved refresh
  // (photos live in existingUnits which gets refreshed via onSaved → parent state)
  const freshPhotos = (idx: number): Photo[] => {
    const det = detections[idx];
    if (det.inspUnitId) {
      return existingUnits.find((u) => u.id === det.inspUnitId)?.photos ?? det.photos;
    }
    return det.photos;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="font-bold text-foreground text-lg">{baseUnitNumber}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {detections.map((det, idx) => {
          const photos = freshPhotos(idx);
          return (
            <div key={det.key} className="border-b border-border">
              {/* Detection header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {idx === 0 ? "Detection" : `Detection #${idx + 1}`}
                </span>
                {detections.length > 1 && (
                  <button
                    onClick={() => removeDetection(idx)}
                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>

              {/* Result grid */}
              <div className="grid grid-cols-4 gap-2 px-4 pb-3">
                {RESULTS.map((r) => {
                  const selected = det.result === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => updateDetection(idx, { result: r.value })}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95"
                      style={
                        selected
                          ? { borderColor: r.color, background: r.bg }
                          : { borderColor: "transparent", background: "rgba(255,255,255,0.04)" }
                      }
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className="text-[9px] font-semibold text-center leading-tight"
                        style={selected ? { color: r.color } : {}}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Location */}
              <div className="px-4 pb-3">
                <input
                  value={det.location}
                  onChange={(e) => updateDetection(idx, { location: e.target.value })}
                  placeholder="Alert location (e.g. headboard, nightstand, couch)…"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Notes */}
              <div className="px-4 pb-3">
                <textarea
                  value={det.notes}
                  onChange={(e) => updateDetection(idx, { notes: e.target.value })}
                  placeholder="Observations, evidence found, tech notes…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Photos */}
              {det.inspUnitId && (
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Photos{photos.length > 0 ? ` (${photos.length})` : ""}
                    </span>
                    <button
                      onClick={() => { setPhotoTargetIdx(idx); fileInputRef.current?.click(); }}
                      disabled={uploading}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Camera className="h-3 w-3" />
                      {uploading && photoTargetIdx === idx ? "Uploading…" : "Add Photo"}
                    </button>
                  </div>
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {photos.map((ph) => (
                        <div key={ph.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ph.url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => deletePhoto(ph.id, det.inspUnitId!)}
                            className="absolute inset-0 bg-black/50 hidden group-active:flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => { setPhotoTargetIdx(idx); fileInputRef.current?.click(); }}
                        className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPhotoTargetIdx(idx); fileInputRef.current?.click(); }}
                      className="w-full h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="text-xs">Add photo</span>
                    </button>
                  )}
                </div>
              )}
              {!det.inspUnitId && (
                <p className="px-4 pb-4 text-xs text-muted-foreground">
                  Save detection first to attach photos.
                </p>
              )}
            </div>
          );
        })}

        {/* Add detection button */}
        <div className="px-4 py-3">
          <button
            onClick={addDetection}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Detection (2nd alert location)
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Footer action buttons */}
      <div className="shrink-0 border-t border-border bg-card p-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={async () => { await saveAll(); onClose(); }}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & Close"}
          </button>
          {hasNext && (
            <button
              onClick={async () => { await saveAll(); onNext(); }}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: "#0ABAB5" }}
            >
              {saving ? "Saving…" : (
                <>Save & Next <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({
  inspectionId,
  onSigned,
  onSkip,
}: {
  inspectionId: string;
  onSigned: () => void;
  onSkip: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerSignature: dataUrl }),
      });
      onSigned();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h2 className="font-bold text-foreground text-lg">Customer Sign-Off</h2>
          <p className="text-xs text-muted-foreground">Have the customer sign below to acknowledge the inspection</p>
        </div>
        <button onClick={onSkip} className="p-1.5 rounded-lg hover:bg-muted">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700">
            By signing, the customer acknowledges that the inspection has been completed and they have received a verbal summary of the findings.
          </p>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={220}
            className="w-full border-2 border-dashed border-border rounded-xl bg-white touch-none"
            style={{ touchAction: "none" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <PenLine className="h-8 w-8 opacity-30" />
                <span className="text-xs opacity-50">Sign here</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="w-48 h-px bg-border" />
          </div>
        </div>

        {hasStrokes && (
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear and redo
          </button>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card p-4 space-y-2">
        <button
          onClick={save}
          disabled={!hasStrokes || saving}
          className="w-full py-3 rounded-xl font-semibold text-base text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "#0ABAB5" }}
        >
          {saving ? "Saving…" : <><CheckCircle2 className="h-5 w-5" />Confirm Signature & Complete</>}
        </button>
        <button onClick={onSkip} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">
          Skip (complete without signature)
        </button>
      </div>
    </div>
  );
}

// ─── Main FieldTechView ───────────────────────────────────────────────────────

export default function FieldTechView({ appointment: initial }: { appointment: TechAppointment }) {
  const router = useRouter();
  const [apt, setApt] = useState(initial);
  const [inspection, setInspection] = useState<Inspection | null>(initial.inspection);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);

  const allPropertyUnits: PUnit[] = useMemo(() => {
    const units: PUnit[] = [];
    for (const b of apt.property.buildings) {
      units.push(...[...b.units].sort((a, b_) => naturalSort(a.unitNumber, b_.unitNumber)));
    }
    units.push(...[...apt.property.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber)));
    return units;
  }, [apt.property]);

  // Group inspection units by base unit number
  const inspMap = useMemo(() => {
    const map = new Map<string, InspUnit[]>();
    for (const u of inspection?.inspectionUnits ?? []) {
      const base = u.unitNumber.replace(/ ·\d+$/, "");
      if (!map.has(base)) map.set(base, []);
      map.get(base)!.push(u);
    }
    return map;
  }, [inspection]);

  const propertyUnitNums = useMemo(
    () => new Set(allPropertyUnits.map((u) => u.unitNumber)),
    [allPropertyUnits]
  );

  const extraUnits: InspUnit[] = useMemo(
    () => (inspection?.inspectionUnits ?? []).filter((u) => {
      const base = u.unitNumber.replace(/ ·\d+$/, "");
      return !propertyUnitNums.has(base);
    }),
    [inspection, propertyUnitNums]
  );

  const completedCount = propertyUnitNums.size > 0
    ? [...propertyUnitNums].filter((n) => (inspMap.get(n)?.length ?? 0) > 0).length
    : 0;
  const totalCount = allPropertyUnits.length;
  const alertCount = [...inspMap.values()].flat().filter(
    (u) => u.detectionResult && ALERT_RESULTS.has(u.detectionResult)
  ).length;

  // Flat sorted list for "next" navigation (skip already-inspected last)
  const sortedForNav = useMemo(() => allPropertyUnits, [allPropertyUnits]);
  const currentNavIdx = editingUnit
    ? sortedForNav.findIndex((u) => u.unitNumber === editingUnit)
    : -1;
  const nextUnit = useMemo(() => {
    if (currentNavIdx < 0) return null;
    // Prefer next un-inspected unit
    for (let i = currentNavIdx + 1; i < sortedForNav.length; i++) {
      if ((inspMap.get(sortedForNav[i].unitNumber)?.length ?? 0) === 0) {
        return sortedForNav[i].unitNumber;
      }
    }
    // Fall back to sequentially next
    return sortedForNav[currentNavIdx + 1]?.unitNumber ?? null;
  }, [currentNavIdx, sortedForNav, inspMap]);

  const refreshInspection = useCallback(async () => {
    const inspId = inspection?.id;
    if (!inspId) return;
    const res = await fetch(`/api/inspections/${inspId}`);
    const data = await res.json();
    if (data.data) setInspection(data.data);
  }, [inspection?.id]);

  const checkIn = async () => {
    setCheckingIn(true);
    try {
      // Set ON_SITE + actualStartTime
      await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "INSPECTION_STARTED",
          actualStartTime: new Date().toISOString(),
        }),
      });

      // Create inspection if none exists
      let insp = inspection;
      if (!insp) {
        const res = await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: apt.id }),
        });
        const data = await res.json();
        if (data.data) {
          insp = { id: data.data.id, inspectionUnits: [] };
          setInspection(insp);
        }
      }

      setApt((prev) => ({
        ...prev,
        status: "INSPECTION_STARTED",
        actualStartTime: new Date().toISOString(),
      }));
    } finally {
      setCheckingIn(false);
    }
  };

  const finishInspection = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/field/${apt.id}/complete`, { method: "POST" });
      if (res.ok) {
        router.push(inspection?.id ? `/inspections/${inspection.id}` : `/scheduling/${apt.id}`);
      }
    } finally {
      setCompleting(false);
    }
  };

  const completeInspection = () => {
    // Show signature pad first, then complete
    setShowSignature(true);
  };

  const isCheckedIn = ["INSPECTION_STARTED", "ON_SITE"].includes(apt.status);
  const isComplete = apt.status === "INSPECTION_COMPLETE";
  const dog = apt.k9Team?.dogs[0];
  const handler = apt.k9Team?.members.find((m) => m.isPrimary);

  return (
    <>
      <div className="min-h-screen bg-background pb-6">
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <div className="font-bold text-foreground text-sm leading-tight">{apt.property.name}</div>
              <div className="text-xs text-muted-foreground">
                {apt.property.addressLine1}, {apt.property.city}
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isComplete ? "bg-green-100 text-green-700" :
              isCheckedIn ? "bg-purple-100 text-purple-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {apt.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

          {/* ── Check-in card ── */}
          <div className="bg-card border border-border rounded-xl p-4">
            {isCheckedIn || isComplete ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Checked in</div>
                  <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: "#0ABAB5" }} />
                    {apt.actualStartTime
                      ? format(new Date(apt.actualStartTime), "h:mm a")
                      : "—"}
                    {apt.actualEndTime && (
                      <span className="text-muted-foreground">
                        → {format(new Date(apt.actualEndTime), "h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
                {isComplete && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                    Complete
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Scheduled {format(new Date(apt.scheduledDate), "h:mm a")}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(apt.scheduledDate), "EEE, MMM d, yyyy")}</div>
                  </div>
                </div>
                <button
                  onClick={checkIn}
                  disabled={checkingIn}
                  className="w-full py-3 rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "#0ABAB5" }}
                >
                  {checkingIn ? "Checking in…" : "✓ Check In & Begin Inspection"}
                </button>
              </div>
            )}
          </div>

          {/* ── Customer card ── */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <div className="font-semibold text-foreground text-sm">
              {apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`}
            </div>
            {apt.customer.companyName && (
              <div className="text-xs text-muted-foreground">
                {apt.customer.firstName} {apt.customer.lastName}
              </div>
            )}
            {apt.customer.phone && (
              <a href={`tel:${apt.customer.phone}`}
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "#0ABAB5" }}>
                <Phone className="h-4 w-4" />
                {apt.customer.phone}
              </a>
            )}
            <InfoRow icon={<MapPin className="h-4 w-4" />}>
              <div>{apt.property.addressLine1}</div>
              <div className="text-muted-foreground">{apt.property.city}, {apt.property.state} {apt.property.zip}</div>
            </InfoRow>
          </div>

          {/* ── Access / Special Instructions ── */}
          {(apt.accessNotes || apt.specialInstructions) && (
            <div className="space-y-2">
              {apt.accessNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="text-xs font-semibold text-amber-700 mb-1">🔑 Access Notes</div>
                  <div className="text-sm text-amber-800">{apt.accessNotes}</div>
                </div>
              )}
              {apt.specialInstructions && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <div className="text-xs font-semibold text-red-700 mb-1">⚠️ Special Instructions</div>
                  <div className="text-sm text-red-800">{apt.specialInstructions}</div>
                </div>
              )}
            </div>
          )}

          {/* ── K9 Team ── */}
          {(dog || handler || apt.technician) && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              {dog && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ background: "rgba(10,186,181,0.12)" }}>🐾</div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{dog.name}</div>
                    {dog.breed && <div className="text-xs text-muted-foreground">{dog.breed}</div>}
                  </div>
                </div>
              )}
              {(handler || apt.technician) && (
                <div className="flex items-center gap-2 ml-auto">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-foreground">
                    {handler
                      ? `${handler.user.firstName} ${handler.user.lastName}`
                      : apt.technician
                      ? `${apt.technician.firstName} ${apt.technician.lastName}`
                      : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Inspection section (only when checked in) ── */}
          {(isCheckedIn || isComplete) && inspection && (
            <>
              {/* Progress */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {completedCount} / {totalCount} units
                    </span>
                    {alertCount > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {alertCount} alert{alertCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                      background: alertCount > 0 ? "#ef4444" : "#0ABAB5",
                    }}
                  />
                </div>
              </div>

              {/* Unit grids by building */}
              {apt.property.buildings.map((building) => (
                <div key={building.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-foreground">{building.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({[...building.units].filter((u) => (inspMap.get(u.unitNumber)?.length ?? 0) > 0).length}/{building.units.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[...building.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber)).map((unit) => (
                      <UnitTile
                        key={unit.id}
                        unit={unit}
                        inspUnits={inspMap.get(unit.unitNumber) ?? []}
                        onSelect={() => !isComplete && setEditingUnit(unit.unitNumber)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Standalone units (no building) */}
              {apt.property.units.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-sm font-semibold text-foreground mb-3">Units</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[...apt.property.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber)).map((unit) => (
                      <UnitTile
                        key={unit.id}
                        unit={unit}
                        inspUnits={inspMap.get(unit.unitNumber) ?? []}
                        onSelect={() => !isComplete && setEditingUnit(unit.unitNumber)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Extra entry points */}
              {extraUnits.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-sm font-semibold text-foreground mb-3">Extra Entry Points</div>
                  <div className="grid grid-cols-4 gap-2">
                    {extraUnits
                      .filter((u) => !u.unitNumber.match(/ ·\d+$/))
                      .sort((a, b) => naturalSort(a.unitNumber, b.unitNumber))
                      .map((u) => (
                        <UnitTile
                          key={u.id}
                          unit={{ id: u.id, unitNumber: u.unitNumber }}
                          inspUnits={[u]}
                          onSelect={() => !isComplete && setEditingUnit(u.unitNumber)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Add extra entry */}
              {!isComplete && (
                <AddExtraEntry
                  inspectionId={inspection.id}
                  onAdded={async (unitNumber) => {
                    await refreshInspection();
                    setEditingUnit(unitNumber);
                  }}
                />
              )}

              {/* Complete button */}
              {!isComplete && completedCount > 0 && (
                <button
                  onClick={completeInspection}
                  disabled={completing || showSignature}
                  className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                  style={{ background: alertCount > 0 ? "#dc2626" : "#0ABAB5" }}
                >
                  {completing ? (
                    <><Clock className="h-5 w-5 animate-spin" />Completing…</>
                  ) : (
                    <><CheckCircle2 className="h-5 w-5" />
                      Complete & Get Signature
                      {alertCount > 0 ? ` — ${alertCount} Alert${alertCount > 1 ? "s" : ""}` : " — All Clear"}
                    </>
                  )}
                </button>
              )}

              {/* Done screen */}
              {isComplete && (
                <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
                  <div className="text-4xl">✅</div>
                  <div className="font-bold text-foreground">Inspection Complete</div>
                  <div className="text-sm text-muted-foreground">
                    Report sent to customer. Invoice created as draft.
                  </div>
                  <button
                    onClick={() => router.push(inspection ? `/inspections/${inspection.id}` : `/scheduling/${apt.id}`)}
                    className="flex items-center gap-1.5 mx-auto text-sm font-medium"
                    style={{ color: "#0ABAB5" }}
                  >
                    View Full Report <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Pre-checkin placeholder */}
          {!isCheckedIn && !isComplete && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Check in to begin the inspection
            </div>
          )}
        </div>
      </div>

      {/* ── Signature overlay ── */}
      {showSignature && inspection && (
        <SignaturePad
          inspectionId={inspection.id}
          onSigned={() => { setShowSignature(false); finishInspection(); }}
          onSkip={() => { setShowSignature(false); finishInspection(); }}
        />
      )}

      {/* ── Unit editor overlay ── */}
      {editingUnit && inspection && (
        <UnitEditor
          baseUnitNumber={editingUnit}
          inspectionId={inspection.id}
          existingUnits={inspMap.get(editingUnit) ?? []}
          onClose={() => setEditingUnit(null)}
          onSaved={refreshInspection}
          hasNext={!!nextUnit}
          onNext={() => {
            if (nextUnit) setEditingUnit(nextUnit);
            else setEditingUnit(null);
          }}
        />
      )}
    </>
  );
}

// ─── AddExtraEntry ────────────────────────────────────────────────────────────

function AddExtraEntry({
  inspectionId,
  onAdded,
}: {
  inspectionId: string;
  onAdded: (unitNumber: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const unitNumber = label.trim();
      await fetch(`/api/inspections/${inspectionId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: [{ unitNumber, detectionResult: "NEGATIVE", technicianNotes: null }],
        }),
      });
      setLabel("");
      setOpen(false);
      await onAdded(unitNumber);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Entry Point (Lobby, Common Area, etc.)
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm text-muted-foreground">Enter a name for this entry point:</p>
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Lobby, Boiler Room, Hallway 2nd Floor"
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          onKeyDown={(e) => e.key === "Enter" && add()}
          autoFocus
        />
        <button onClick={add} disabled={!label.trim() || saving}
          className="px-4 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#0ABAB5" }}>
          Add
        </button>
        <button onClick={() => { setOpen(false); setLabel(""); }}
          className="px-3 h-9 rounded-lg text-sm border border-border text-muted-foreground">
          ✕
        </button>
      </div>
    </div>
  );
}
