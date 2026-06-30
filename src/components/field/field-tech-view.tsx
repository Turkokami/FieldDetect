"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, MapPin, User, AlertTriangle, CheckCircle2,
  Camera, Plus, X, Clock, Trash2, ArrowRight, PenLine,
  ArrowLeft, Building2, WifiOff, FileText, Navigation, Map as MapIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUploadThing } from "@/lib/uploadthing-client";
import { PropertyMapEditor } from "@/components/scheduling/property-map-editor";

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
type Inspection = {
  id: string;
  inspectionUnits: InspUnit[];
  summaryNotes: string | null;
};
type K9Dog = { id: string; name: string; breed: string | null };
type Member = { isPrimary: boolean; user: { firstName: string; lastName: string } };
type K9Team = { id: string; name: string; dogs: K9Dog[]; members: Member[] } | null;

type TechPropertyMap = {
  id: string;
  name: string;
  imageUrl: string;
  markers: unknown[];
};

export type TechAppointment = {
  id: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  accessNotes: string | null;
  specialInstructions: string | null;
  notes: string | null;
  customer: Customer;
  property: Property;
  technician: { firstName: string; lastName: string } | null;
  k9Team: K9Team;
  inspection: Inspection | null;
  propertyMaps?: TechPropertyMap[];
};

type CompletionData = {
  overallResult: string;
  positiveUnits: { unitNumber: string; result: string; location: string | null }[];
  counts: { total: number; positive: number; negative: number; inconclusive: number; inaccessible: number };
};

// ─── Offline helpers ──────────────────────────────────────────────────────────

const CACHE_PREFIX = "fd-job-";
const QUEUE_KEY = "fd-sync-queue";

function cacheJob(apt: TechAppointment, inspection: Inspection | null) {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${apt.id}`,
      JSON.stringify({ apt, inspection, cachedAt: Date.now() })
    );
  } catch { /* storage full */ }
}

type QueuedSave = { id: string; url: string; method: string; body: string };

function enqueueSave(item: Omit<QueuedSave, "id">) {
  try {
    const queue: QueuedSave[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    queue.push({ ...item, id: `${Date.now()}-${Math.random()}` });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

async function flushSyncQueue(): Promise<number> {
  try {
    const queue: QueuedSave[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    if (!queue.length) return 0;
    const failed: QueuedSave[] = [];
    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: item.body,
        });
        if (!res.ok) failed.push(item);
      } catch { failed.push(item); }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    return queue.length - failed.length;
  } catch { return 0; }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_WIDE_TYPES = new Set([
  "GOOSE_CONTROL", "RODENT_INSPECTION", "RODENT_EXCLUSION",
  "WILDLIFE_INSPECTION", "WILDLIFE_REMOVAL",
]);

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

// ─── Dark card/border helpers ─────────────────────────────────────────────────

const DARK = {
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as React.CSSProperties,
  cardTeal: { background: "rgba(10,186,181,0.08)", border: "1px solid rgba(10,186,181,0.2)" } as React.CSSProperties,
  cardAmber: { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" } as React.CSSProperties,
  cardRed: { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" } as React.CSSProperties,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0" style={{ color: "#64748b" }}>{icon}</span>
      <div className="text-sm" style={{ color: "#cbd5e1" }}>{children}</div>
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
          : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8" }
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
  key: string;
  inspUnitId: string | null;
  unitNumber: string;
  result: string;
  location: string;
  notes: string;
  photos: Photo[];
};

function UnitEditor({
  baseUnitNumber, inspectionId, existingUnits, onClose, onSaved, onNext, hasNext,
}: {
  baseUnitNumber: string; inspectionId: string; existingUnits: InspUnit[];
  onClose: () => void; onSaved: () => Promise<void>; onNext: () => void; hasNext: boolean;
}) {
  const { startUpload } = useUploadThing("inspectionPhoto");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetIdx, setPhotoTargetIdx] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildDetections = useCallback((): LocalDetection[] => {
    if (existingUnits.length === 0) {
      return [{ key: "new-0", inspUnitId: null, unitNumber: baseUnitNumber, result: "NEGATIVE", location: "", notes: "", photos: [] }];
    }
    const sorted = [...existingUnits].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber));
    return sorted.map((u) => ({
      key: u.id, inspUnitId: u.id, unitNumber: u.unitNumber,
      result: u.detectionResult ?? "NEGATIVE", location: u.alertLocation ?? "",
      notes: u.technicianNotes ?? "", photos: u.photos,
    }));
  }, [existingUnits, baseUnitNumber]);

  const [detections, setDetections] = useState<LocalDetection[]>(buildDetections);

  const updateDetection = (idx: number, patch: Partial<LocalDetection>) => {
    setDetections((prev) => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const addDetection = () => {
    const suffix = detections.length + 1;
    setDetections((prev) => [...prev, {
      key: `new-${Date.now()}`, inspUnitId: null,
      unitNumber: `${baseUnitNumber} ·${suffix}`,
      result: "NEGATIVE", location: "", notes: "", photos: [],
    }]);
  };

  const removeDetection = (idx: number) => {
    if (detections.length === 1) return;
    setDetections((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async (): Promise<{ success: boolean; updatedDetections: LocalDetection[] }> => {
    setSaving(true);
    setSaveError(null);
    let anyFailed = false;
    const newDetections = detections.map((d) => ({ ...d }));
    try {
      for (let i = 0; i < detections.length; i++) {
        const det = detections[i];
        if (det.inspUnitId) {
          const res = await fetch(`/api/inspection-units/${det.inspUnitId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              detectionResult: det.result,
              alertLocation: det.location || null,
              technicianNotes: det.notes || null,
            }),
          });
          if (!res.ok) {
            anyFailed = true;
            const errBody = await res.json().catch(() => ({}));
            console.error("[saveAll PATCH]", errBody);
            enqueueSave({ url: `/api/inspection-units/${det.inspUnitId}`, method: "PATCH", body: JSON.stringify({ detectionResult: det.result, alertLocation: det.location || null, technicianNotes: det.notes || null }) });
          }
        } else {
          const payload: Record<string, unknown> = { unitNumber: det.unitNumber, detectionResult: det.result };
          if (det.location) payload.alertLocation = det.location;
          if (det.notes) payload.technicianNotes = det.notes;
          const res = await fetch(`/api/inspections/${inspectionId}/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ units: [payload] }),
          });
          if (!res.ok) {
            anyFailed = true;
            const errBody = await res.json().catch(() => ({}));
            console.error("[saveAll POST]", errBody);
            enqueueSave({ url: `/api/inspections/${inspectionId}/units`, method: "POST", body: JSON.stringify({ units: [payload] }) });
          } else {
            const body = await res.json().catch(() => ({}));
            const createdId = body?.data?.[0]?.id as string | undefined;
            if (createdId) newDetections[i] = { ...newDetections[i], inspUnitId: createdId };
          }
        }
      }
      const keptIds = new Set(newDetections.map((d) => d.inspUnitId).filter(Boolean));
      for (const eu of existingUnits) {
        if (!keptIds.has(eu.id)) {
          await fetch(`/api/inspection-units/${eu.id}`, { method: "DELETE" });
        }
      }
      if (anyFailed) {
        setSaveError("Save failed — check your connection and try again.");
      }
      setDetections(newDetections);
      await onSaved();
      return { success: !anyFailed, updatedDetections: newDetections };
    } catch (err) {
      console.error("[saveAll]", err);
      setSaveError("Save failed — check your connection and try again.");
      return { success: false, updatedDetections: detections };
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let unitId = detections[photoTargetIdx]?.inspUnitId;

    if (!unitId) {
      const { success, updatedDetections } = await saveAll();
      if (!success) { if (fileInputRef.current) fileInputRef.current.value = ""; return; }
      unitId = updatedDetections[photoTargetIdx]?.inspUnitId ?? null;
      if (!unitId) { if (fileInputRef.current) fileInputRef.current.value = ""; return; }
    }

    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]) { toast.error("Upload failed — check UploadThing is configured"); return; }
      const { ufsUrl, key, name } = uploaded[0];
      const res = await fetch(`/api/inspection-units/${unitId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ufsUrl, key, filename: name }),
      });
      if (!res.ok) { toast.error("Failed to save photo"); return; }
      await onSaved();
    } catch (err) {
      console.error("[INSPECTION_PHOTO_UPLOAD]", err);
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deletePhoto = async (photoId: string, unitId: string) => {
    await fetch(`/api/inspection-units/${unitId}/photos?photoId=${photoId}`, { method: "DELETE" });
    await onSaved();
  };

  const freshPhotos = (idx: number): Photo[] => {
    const det = detections[idx];
    if (det.inspUnitId) return existingUnits.find((u) => u.id === det.inspUnitId)?.photos ?? det.photos;
    return det.photos;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0F1A" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <h2 className="font-bold text-white text-lg">{baseUnitNumber}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "#64748b" }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div className="px-4 py-2.5 flex items-center gap-2 text-xs font-semibold shrink-0" style={{ background: "rgba(239,68,68,0.15)", borderBottom: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {saveError}
          <button onClick={() => setSaveError(null)} className="ml-auto" style={{ color: "#f87171" }}>✕</button>
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {detections.map((det, idx) => {
          const photos = freshPhotos(idx);
          return (
            <div key={det.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                  {idx === 0 ? "Detection" : `Detection #${idx + 1}`}
                </span>
                {detections.length > 1 && (
                  <button onClick={() => removeDetection(idx)} className="flex items-center gap-1 text-xs text-red-400">
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
                      style={selected
                        ? { borderColor: r.color, background: r.bg }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className="text-[9px] font-semibold text-center leading-tight"
                        style={selected ? { color: r.color } : { color: "#94a3b8" }}>
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
                  className="w-full h-9 px-3 rounded-lg text-sm text-white focus:outline-none focus:ring-2"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", focusRingColor: "#0ABAB5" } as React.CSSProperties}
                />
              </div>

              {/* Notes */}
              <div className="px-4 pb-3">
                <textarea
                  value={det.notes}
                  onChange={(e) => updateDetection(idx, { notes: e.target.value })}
                  placeholder="Observations, evidence found, tech notes…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Photos */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                    Photos{photos.length > 0 ? ` (${photos.length})` : ""}
                  </span>
                  <button
                    onClick={() => { setPhotoTargetIdx(idx); fileInputRef.current?.click(); }}
                    disabled={uploading || saving}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg disabled:opacity-50"
                    style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", background: "rgba(255,255,255,0.04)" }}
                  >
                    <Camera className="h-3 w-3" />
                    {uploading && photoTargetIdx === idx ? "Uploading…" : saving && photoTargetIdx === idx ? "Saving…" : "Add Photo"}
                  </button>
                </div>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {photos.map((ph) => (
                      <div key={ph.id} className="relative aspect-square rounded-lg overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ph.url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => deletePhoto(ph.id, det.inspUnitId!)}
                          className="absolute inset-0 bg-black/60 hidden group-active:flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => { setPhotoTargetIdx(idx); fileInputRef.current?.click(); }}
                      className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: "rgba(255,255,255,0.15)" }}
                    >
                      <Plus className="h-4 w-4" style={{ color: "#64748b" }} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setPhotoTargetIdx(idx); fileInputRef.current?.click(); }}
                    disabled={uploading || saving}
                    className="w-full h-16 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    style={{ borderColor: "rgba(255,255,255,0.12)", color: "#64748b" }}
                  >
                    <Camera className="h-4 w-4" />
                    <span className="text-xs">{!det.inspUnitId ? "Add photo (auto-saves first)" : "Add photo"}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add detection */}
        <div className="px-4 py-3">
          <button
            onClick={addDetection}
            className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm flex items-center justify-center gap-2 transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#64748b" }}
          >
            <Plus className="h-4 w-4" />
            Add Detection (2nd alert location)
          </button>
        </div>

        {/* Save buttons inside scroll area — always reachable even when keyboard is open */}
        <div className="px-4 pb-6 pt-1 flex gap-2">
          <button
            onClick={async () => { const { success } = await saveAll(); if (success) onClose(); }}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 active:scale-95 transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)" }}
          >
            {saving ? "Saving…" : "Save & Close"}
          </button>
          {hasNext && (
            <button
              onClick={async () => { const { success } = await saveAll(); if (success) onNext(); }}
              disabled={saving}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: "#0ABAB5" }}
            >
              {saving ? "Saving…" : <><span>Save & Next</span> <ArrowRight className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />

      {/* Footer — secondary save strip pinned at bottom (above keyboard on some devices) */}
      <div className="shrink-0 px-4 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,15,26,0.95)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <button
          onClick={async () => { const { success } = await saveAll(); if (success) onClose(); }}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }}
        >
          {saving ? "Saving…" : "Save & Close"}
        </button>
        {hasNext && (
          <button
            onClick={async () => { const { success } = await saveAll(); if (success) onNext(); }}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#0ABAB5" }}
          >
            {saving ? "Saving…" : <><span>Save & Next</span> <ArrowRight className="h-4 w-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({ inspectionId, onSigned, onSkip }: { inspectionId: string; onSigned: () => void; onSkip: () => void }) {
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0F1A" }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div>
          <h2 className="font-bold text-white text-lg">Customer Sign-Off</h2>
          <p className="text-xs" style={{ color: "#64748b" }}>Have the customer sign below to acknowledge the inspection</p>
        </div>
        <button onClick={onSkip} className="p-1.5 rounded-lg" style={{ color: "#64748b" }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl p-3" style={DARK.cardAmber}>
          <p className="text-xs" style={{ color: "#fcd34d" }}>
            By signing, the customer acknowledges that the inspection has been completed and they have received a verbal summary of the findings.
          </p>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={220}
            className="w-full rounded-xl bg-white touch-none"
            style={{ touchAction: "none", border: "2px dashed rgba(255,255,255,0.15)" }}
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
              <div className="flex flex-col items-center gap-2" style={{ color: "#94a3b8" }}>
                <PenLine className="h-8 w-8 opacity-30" />
                <span className="text-xs opacity-50">Sign here</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="w-48 h-px" style={{ background: "rgba(0,0,0,0.2)" }} />
          </div>
        </div>

        {hasStrokes && (
          <button onClick={clear} className="text-xs underline" style={{ color: "#64748b" }}>
            Clear and redo
          </button>
        )}
      </div>

      <div className="shrink-0 p-4 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <button
          onClick={save}
          disabled={!hasStrokes || saving}
          className="w-full py-3 rounded-xl font-semibold text-base text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "#0ABAB5" }}
        >
          {saving ? "Saving…" : <><CheckCircle2 className="h-5 w-5" />Confirm Signature & Complete</>}
        </button>
        <button onClick={onSkip} className="w-full py-2 text-sm" style={{ color: "#64748b" }}>
          Skip (complete without signature)
        </button>
      </div>
    </div>
  );
}

// ─── Completion Summary ───────────────────────────────────────────────────────

function CompletionSummary({
  data,
  appointmentId,
  inspectionId,
}: {
  data: CompletionData;
  appointmentId: string;
  inspectionId: string | null;
}) {
  const cfg = RESULT_MAP[data.overallResult] ?? RESULT_MAP["NEGATIVE"];
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReport = async () => {
    setSending(true);
    try {
      await fetch(`/api/field/${appointmentId}/complete`, { method: "POST" });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0F1A" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <Link href="/field" className="p-1 -ml-1" style={{ color: "#64748b" }}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="font-bold text-white text-sm">Inspection Complete</div>
          <div className="text-xs" style={{ color: "#64748b" }}>Summary</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4">
        {/* Overall result banner */}
        <div className="rounded-2xl p-5 text-center" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}>
          <div className="text-5xl mb-2">{cfg.emoji}</div>
          <div className="text-xl font-black text-white mb-1">{cfg.label}</div>
          <div className="text-sm" style={{ color: cfg.color }}>Overall Result</div>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Inspected", val: data.counts.total, color: "#94a3b8" },
            { label: "Positive Alerts", val: data.counts.positive, color: data.counts.positive > 0 ? "#ef4444" : "#22c55e" },
            { label: "Negative",        val: data.counts.negative, color: "#22c55e" },
            { label: "Other",           val: data.counts.inconclusive + data.counts.inaccessible, color: "#eab308" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={DARK.card}>
              <div className="text-2xl font-black text-white">{val}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Positive units list */}
        {data.positiveUnits.length > 0 && (
          <div className="rounded-xl p-4 space-y-2" style={DARK.cardRed}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#f87171" }}>
              🚨 Alert Units
            </div>
            {data.positiveUnits.map((u, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-white">{u.unitNumber}</span>
                  {u.location && <span className="text-xs ml-2" style={{ color: "#94a3b8" }}>{u.location}</span>}
                </div>
                <span className="text-xs font-semibold shrink-0" style={{ color: RESULT_MAP[u.result]?.color ?? "#ef4444" }}>
                  {RESULT_MAP[u.result]?.label ?? u.result}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {!sent ? (
            <button
              onClick={sendReport}
              disabled={sending}
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
            >
              {sending ? "Sending…" : "📧 Send Report to Customer"}
            </button>
          ) : (
            <div className="w-full py-3.5 rounded-xl font-semibold text-center" style={DARK.cardTeal}>
              <span style={{ color: "#0ABAB5" }}>✓ Report sent to customer</span>
            </div>
          )}

          {inspectionId && (
            <Link
              href={`/inspections/${inspectionId}`}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }}
            >
              <FileText className="h-4 w-4" />
              View Full Report
            </Link>
          )}

          <Link
            href="/field"
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ color: "#64748b" }}
          >
            ← Back to Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Office Note Panel ────────────────────────────────────────────────────────

const QUICK_NOTES = [
  "Running late — be there soon",
  "Can't access property — need key/code",
  "Tenant not home for unit access",
  "Found issue — need office guidance",
  "Schedule follow-up inspection",
  "Inspection complete — all clear",
];

function OfficeNotePanel({
  appointmentId,
  techName,
  existingNotes,
  onClose,
  onSent,
}: {
  appointmentId: string;
  techName: string;
  existingNotes: string | null;
  onClose: () => void;
  onSent: (updatedNotes: string) => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const now = new Date();
      const timestamp = now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
      const entry = `[${timestamp} · ${techName}] ${trimmed}`;
      const updated = existingNotes ? `${existingNotes}\n${entry}` : entry;
      await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updated }),
      });
      onSent(updated);
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } finally {
      setSending(false);
    }
  };

  const noteLines = existingNotes ? existingNotes.split("\n").filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0F1A" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div>
          <h2 className="font-bold text-white text-base">Message Office</h2>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Notes appear in the office appointment view</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "#64748b" }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick presets */}
        <div className="px-4 pt-4 pb-3">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "#64748b" }}>Quick Message</div>
          <div className="space-y-2">
            {QUICK_NOTES.map((note) => (
              <button
                key={note}
                onClick={() => send(note)}
                disabled={sending}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: "rgba(10,186,181,0.08)", border: "1px solid rgba(10,186,181,0.2)", color: "#cbd5e1" }}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Custom note */}
        <div className="px-4 pb-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>Custom Note</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a custom note to the office…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            onClick={() => send(text)}
            disabled={!text.trim() || sending}
            className="mt-2 w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "#0ABAB5" }}
          >
            {sent ? "✓ Sent!" : sending ? "Sending…" : "Send to Office"}
          </button>
        </div>

        {/* Previous notes */}
        {noteLines.length > 0 && (
          <div className="px-4 pb-6">
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>Previous Notes</div>
            <div className="space-y-2">
              {[...noteLines].reverse().map((line, i) => (
                <div key={i} className="rounded-xl px-3 py-2.5 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AddUnitToProperty ────────────────────────────────────────────────────────

type AddUnitMode = "single" | "range" | "list";

function AddUnitToProperty({ propertyId, buildingId, onAdded }: {
  propertyId: string;
  buildingId: string | null;
  onAdded: (unitNumber: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AddUnitMode>("single");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [singleNum, setSingleNum] = useState("");
  const [rangePrefix, setRangePrefix] = useState("");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("10");
  const [listText, setListText] = useState("");

  const rangePreview = useMemo(() => {
    const s = parseInt(rangeStart) || 1;
    const e = parseInt(rangeEnd) || 1;
    if (e < s || e - s > 199) return [];
    const prefix = rangePrefix.trim();
    return Array.from({ length: e - s + 1 }, (_, i) => {
      const n = s + i;
      return prefix ? `${prefix} ${n}` : String(n);
    });
  }, [rangePrefix, rangeStart, rangeEnd]);

  const listUnits = useMemo(
    () => listText.split("\n").map((l) => l.trim()).filter(Boolean),
    [listText]
  );

  const addSingle = async () => {
    const num = singleNum.trim();
    if (!num) return;
    setSaving(true); setAddError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitNumber: num, buildingId: buildingId ?? undefined }),
      });
      if (!res.ok) { setAddError("Failed to add unit. Try again."); return; }
      setSingleNum(""); setOpen(false);
      await onAdded(num);
    } finally { setSaving(false); }
  };

  const addBulk = async (units: string[]) => {
    if (!units.length) return;
    setSaving(true); setAddError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/units/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units: units.map((unitNumber) => ({ unitNumber, buildingId: buildingId ?? undefined })) }),
      });
      if (!res.ok) { setAddError("Failed to add units. Try again."); return; }
      setListText(""); setOpen(false);
      await onAdded(null);
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" } as React.CSSProperties;
  const labelStyle = { color: "#64748b" } as React.CSSProperties;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 rounded-lg border border-dashed text-xs flex items-center justify-center gap-1.5 transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.15)", color: "#64748b" }}
      >
        <Plus className="h-3.5 w-3.5" /> Add Units
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0F1A" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <h2 className="font-bold text-white text-base">Add Units</h2>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg" style={{ color: "#64748b" }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["single", "range", "list"] as AddUnitMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={mode === m
              ? { background: "#0ABAB5", color: "#fff" }
              : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {addError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium shrink-0" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          {addError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8 space-y-4">

        {/* ── Single ── */}
        {mode === "single" && (
          <>
            <p className="text-xs" style={labelStyle}>Enter a unit number to add it.</p>
            <input
              value={singleNum}
              onChange={(e) => setSingleNum(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSingle()}
              placeholder="Unit # (e.g. 101, Room 5, Suite A)"
              autoFocus
              className="w-full h-11 px-3 rounded-xl text-sm text-white focus:outline-none"
              style={inputStyle}
            />
            <button
              onClick={addSingle}
              disabled={!singleNum.trim() || saving}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: "#0ABAB5" }}
            >
              {saving ? "Adding…" : "Add Unit"}
            </button>
          </>
        )}

        {/* ── Range ── */}
        {mode === "range" && (
          <>
            <p className="text-xs" style={labelStyle}>Generate a numbered sequence of units (max 200).</p>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={labelStyle}>Prefix (optional)</label>
              <input
                value={rangePrefix}
                onChange={(e) => setRangePrefix(e.target.value)}
                placeholder="Unit, Room, Apt… (leave blank for numbers only)"
                className="w-full h-11 px-3 rounded-xl text-sm text-white focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={labelStyle}>From</label>
                <input
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  type="number" min="1"
                  className="w-full h-11 px-3 rounded-xl text-sm text-white focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={labelStyle}>To</label>
                <input
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  type="number" min="1"
                  className="w-full h-11 px-3 rounded-xl text-sm text-white focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            {rangePreview.length > 0 && (
              <div className="rounded-xl px-3.5 py-3" style={{ background: "rgba(10,186,181,0.06)", border: "1px solid rgba(10,186,181,0.2)" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#0ABAB5" }}>
                  {rangePreview.length} unit{rangePreview.length !== 1 ? "s" : ""} will be added
                </div>
                <div className="text-xs" style={{ color: "#94a3b8" }}>
                  {rangePreview.slice(0, 5).join(", ")}
                  {rangePreview.length > 5 && <span style={{ color: "#64748b" }}> … +{rangePreview.length - 5} more</span>}
                </div>
              </div>
            )}
            {parseInt(rangeEnd) - parseInt(rangeStart) > 199 && (
              <p className="text-xs" style={{ color: "#f87171" }}>Max 200 units per batch.</p>
            )}
            <button
              onClick={() => addBulk(rangePreview)}
              disabled={!rangePreview.length || saving}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: "#0ABAB5" }}
            >
              {saving ? "Adding…" : `Add ${rangePreview.length || 0} Unit${rangePreview.length !== 1 ? "s" : ""}`}
            </button>
          </>
        )}

        {/* ── List ── */}
        {mode === "list" && (
          <>
            <p className="text-xs" style={labelStyle}>Type or paste unit numbers, one per line.</p>
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              placeholder={"101\n102\n103\n104A\n104B"}
              rows={10}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none resize-none font-mono"
              style={inputStyle}
            />
            {listUnits.length > 0 && (
              <p className="text-xs font-medium" style={{ color: "#0ABAB5" }}>
                {listUnits.length} unit{listUnits.length !== 1 ? "s" : ""} ready to add
              </p>
            )}
            <button
              onClick={() => addBulk(listUnits)}
              disabled={!listUnits.length || saving}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: "#0ABAB5" }}
            >
              {saving ? "Adding…" : `Add ${listUnits.length || 0} Unit${listUnits.length !== 1 ? "s" : ""}`}
            </button>
          </>
        )}

      </div>
    </div>
  );
}

// ─── BuildingHeader (inline rename + delete) ──────────────────────────────────

function BuildingHeader({
  building,
  inspectedCount,
  onRenamed,
  onDeleted,
}: {
  building: Building;
  inspectedCount: number;
  onRenamed: (newName: string) => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "confirmDelete">("view");
  const [name, setName] = useState(building.name);
  const [saving, setSaving] = useState(false);

  const rename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === building.name) { setMode("view"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) { onRenamed(trimmed); setMode("view"); }
    } finally { setSaving(false); }
  };

  const deleteBuilding = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}`, { method: "DELETE" });
      if (res.ok) onDeleted();
    } finally { setSaving(false); }
  };

  if (mode === "rename") {
    return (
      <div className="flex items-center gap-2 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setMode("view"); }}
          autoFocus
          className="flex-1 h-8 px-2.5 rounded-lg text-sm text-white focus:outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(10,186,181,0.4)" }}
        />
        <button onClick={rename} disabled={saving || !name.trim()}
          className="px-3 h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "#0ABAB5" }}>
          {saving ? "…" : "Save"}
        </button>
        <button onClick={() => { setName(building.name); setMode("view"); }}
          className="px-2.5 h-8 rounded-lg text-xs" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#64748b" }}>
          ✕
        </button>
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-red-400 flex-1">Delete &ldquo;{building.name}&rdquo;? Units move to standalone.</span>
        <button onClick={deleteBuilding} disabled={saving}
          className="px-3 h-7 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "#dc2626" }}>
          {saving ? "…" : "Delete"}
        </button>
        <button onClick={() => setMode("view")}
          className="px-2.5 h-7 rounded-lg text-xs" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#64748b" }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-semibold text-white">{building.name}</span>
      <span className="text-xs" style={{ color: "#64748b" }}>
        ({inspectedCount}/{building.units.length})
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setMode("rename")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "#64748b" }}
          title="Rename building"
        >
          <PenLine className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setMode("confirmDelete")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "#64748b" }}
          title="Delete building"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── AddBuildingToProperty ────────────────────────────────────────────────────

function AddBuildingToProperty({ propertyId, onAdded }: { propertyId: string; onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (res.ok) { setName(""); setOpen(false); await onAdded(); }
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm flex items-center justify-center gap-2 transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "#64748b" }}
      >
        <Building2 className="h-4 w-4" /> Add Building
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={DARK.card}>
      <p className="text-sm font-semibold text-white">Add Building</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Building name (e.g. Building A, North Wing)"
          className="flex-1 h-9 px-3 rounded-lg text-sm text-white focus:outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          autoFocus
        />
        <button onClick={add} disabled={!name.trim() || saving}
          className="px-4 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#0ABAB5" }}>
          {saving ? "…" : "Add"}
        </button>
        <button onClick={() => { setOpen(false); setName(""); }}
          className="px-3 h-9 rounded-lg text-sm" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#64748b" }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── AddExtraEntry ────────────────────────────────────────────────────────────

function AddExtraEntry({
  inspectionId,
  onAdded,
  buttonLabel = "Add Entry Point (Lobby, Common Area, etc.)",
  inputPlaceholder = "e.g. Lobby, Boiler Room, Hallway 2nd Floor",
  promptText = "Enter a name for this entry point:",
}: {
  inspectionId: string;
  onAdded: (unitNumber: string) => Promise<void>;
  buttonLabel?: string;
  inputPlaceholder?: string;
  promptText?: string;
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
        body: JSON.stringify({ units: [{ unitNumber, detectionResult: "NEGATIVE" }] }),
      });
      setLabel(""); setOpen(false);
      await onAdded(unitNumber);
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm flex items-center justify-center gap-2 transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "#64748b" }}
      >
        <Plus className="h-4 w-4" /> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={DARK.card}>
      <p className="text-sm" style={{ color: "#94a3b8" }}>{promptText}</p>
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={inputPlaceholder}
          className="flex-1 h-9 px-3 rounded-lg text-sm text-white focus:outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          autoFocus
        />
        <button onClick={add} disabled={!label.trim() || saving}
          className="px-4 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#0ABAB5" }}>
          {saving ? "…" : "Add"}
        </button>
        <button onClick={() => { setOpen(false); setLabel(""); }}
          className="px-3 h-9 rounded-lg text-sm" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#64748b" }}>
          ✕
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
  const [goingEnRoute, setGoingEnRoute] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [jobNotes, setJobNotes] = useState(initial.inspection?.summaryNotes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [showOfficeNote, setShowOfficeNote] = useState(false);
  const [officeNotes, setOfficeNotes] = useState<string | null>(initial.notes ?? null);
  const [activeTab, setActiveTab] = useState<"inspection" | "map">("inspection");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSiteWide = SITE_WIDE_TYPES.has(initial.serviceType);
  const hasMaps = (initial.propertyMaps?.length ?? 0) > 0 || SITE_WIDE_TYPES.has(initial.serviceType);

  // ── Online/offline detection ──
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await flushSyncQueue();
      if (synced > 0) {
        setPendingSync(0);
        await refreshInspection();
        toast.success(`${synced} result${synced > 1 ? "s" : ""} synced`);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cache job data locally ──
  useEffect(() => {
    cacheJob(apt, inspection);
  }, [apt.id, inspection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync queue counter ──
  useEffect(() => {
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      setPendingSync(q.length);
    } catch { /* ignore */ }
  }, []);

  const allPropertyUnits: PUnit[] = useMemo(() => {
    const units: PUnit[] = [];
    for (const b of apt.property.buildings) {
      units.push(...[...b.units].sort((a, b_) => naturalSort(a.unitNumber, b_.unitNumber)));
    }
    units.push(...[...apt.property.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber)));
    return units;
  }, [apt.property]);

  const inspMap = useMemo(() => {
    const map = new Map<string, InspUnit[]>();
    for (const u of inspection?.inspectionUnits ?? []) {
      const base = u.unitNumber.replace(/ ·\d+$/, "");
      if (!map.has(base)) map.set(base, []);
      map.get(base)!.push(u);
    }
    return map;
  }, [inspection]);

  const propertyUnitNums = useMemo(() => new Set(allPropertyUnits.map((u) => u.unitNumber)), [allPropertyUnits]);

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
  const alertCount = [...inspMap.values()].flat().filter((u) => u.detectionResult && ALERT_RESULTS.has(u.detectionResult)).length;
  const siteWideZoneCount = isSiteWide ? extraUnits.filter((u) => !u.unitNumber.match(/ ·\d+$/)).length : 0;

  const sortedForNav = useMemo(() => allPropertyUnits, [allPropertyUnits]);
  const currentNavIdx = editingUnit ? sortedForNav.findIndex((u) => u.unitNumber === editingUnit) : -1;
  const nextUnit = useMemo(() => {
    if (currentNavIdx < 0) return null;
    for (let i = currentNavIdx + 1; i < sortedForNav.length; i++) {
      if ((inspMap.get(sortedForNav[i].unitNumber)?.length ?? 0) === 0) return sortedForNav[i].unitNumber;
    }
    return null;
  }, [currentNavIdx, sortedForNav, inspMap]);

  const refreshInspection = useCallback(async () => {
    const inspId = inspection?.id;
    if (!inspId) return;
    const res = await fetch(`/api/inspections/${inspId}`);
    const data = await res.json();
    if (data.data) setInspection({ id: data.data.id, inspectionUnits: data.data.inspectionUnits, summaryNotes: data.data.summaryNotes ?? null });
  }, [inspection?.id]);

  const refreshProperty = useCallback(async () => {
    const res = await fetch(`/api/properties/${apt.property.id}`);
    const data = await res.json();
    if (data.data) {
      setApt((prev) => ({ ...prev, property: { ...prev.property, buildings: data.data.buildings, units: data.data.units } }));
    }
  }, [apt.property.id]);

  const markEnRoute = async () => {
    setGoingEnRoute(true);
    try {
      await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EN_ROUTE" }),
      });
      setApt((prev) => ({ ...prev, status: "EN_ROUTE" }));
    } finally {
      setGoingEnRoute(false);
    }
  };

  const checkIn = async () => {
    setCheckingIn(true);
    try {
      await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INSPECTION_STARTED", actualStartTime: new Date().toISOString() }),
      });
      let insp = inspection;
      if (!insp) {
        const res = await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: apt.id }),
        });
        const data = await res.json();
        if (data.data) {
          insp = { id: data.data.id, inspectionUnits: [], summaryNotes: null };
          setInspection(insp);
        }
      }
      setApt((prev) => ({ ...prev, status: "INSPECTION_STARTED", actualStartTime: new Date().toISOString() }));
    } finally {
      setCheckingIn(false);
    }
  };

  const finishInspection = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/field/${apt.id}/complete`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Build summary from current inspection state
        const allInspUnits = inspection?.inspectionUnits ?? [];
        const positiveUnits = allInspUnits
          .filter((u) => u.detectionResult && ALERT_RESULTS.has(u.detectionResult))
          .map((u) => ({ unitNumber: u.unitNumber, result: u.detectionResult!, location: u.alertLocation }));
        const counts = allInspUnits.reduce(
          (acc, u) => {
            acc.total++;
            if (u.detectionResult === "NEGATIVE") acc.negative++;
            else if (u.detectionResult && ALERT_RESULTS.has(u.detectionResult)) acc.positive++;
            else if (u.detectionResult === "INCONCLUSIVE") acc.inconclusive++;
            else acc.inaccessible++;
            return acc;
          },
          { total: 0, positive: 0, negative: 0, inconclusive: 0, inaccessible: 0 }
        );
        setApt((prev) => ({ ...prev, status: "INSPECTION_COMPLETE", actualEndTime: new Date().toISOString() }));
        setCompletionData({ overallResult: data.data?.overallResult ?? "NEGATIVE", positiveUnits, counts });
      }
    } finally {
      setCompleting(false);
    }
  };

  const completeInspection = () => setShowSignature(true);

  // ── Debounced notes save ──
  const saveNotes = (value: string) => {
    setJobNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      if (!inspection?.id) return;
      setNotesSaving(true);
      try {
        await fetch(`/api/inspections/${inspection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summaryNotes: value }),
        });
      } finally {
        setNotesSaving(false);
      }
    }, 1000);
  };

  const isEnRoute = apt.status === "EN_ROUTE";
  const isCheckedIn = ["INSPECTION_STARTED", "ON_SITE"].includes(apt.status);
  const isComplete = apt.status === "INSPECTION_COMPLETE";
  const isPre = !isEnRoute && !isCheckedIn && !isComplete;
  const dog = apt.k9Team?.dogs[0];
  const handler = apt.k9Team?.members.find((m) => m.isPrimary);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${apt.property.addressLine1} ${apt.property.city} ${apt.property.state}`)}`;

  // Show completion summary if done
  if (completionData) {
    return <CompletionSummary data={completionData} appointmentId={apt.id} inspectionId={inspection?.id ?? null} />;
  }

  return (
    <>
      <div className="min-h-screen pb-6" style={{ background: "#0A0F1A" }}>

        {/* ── Offline banner ── */}
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold" style={{ background: "rgba(245,158,11,0.15)", borderBottom: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
            <WifiOff className="h-3.5 w-3.5" /> Offline — changes will sync when reconnected
          </div>
        )}
        {isOnline && pendingSync > 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold" style={{ background: "rgba(10,186,181,0.1)", borderBottom: "1px solid rgba(10,186,181,0.2)", color: "#0ABAB5" }}>
            ↑ Syncing {pendingSync} saved result{pendingSync > 1 ? "s" : ""}…
          </div>
        )}

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 px-4 py-3" style={{ background: "rgba(10,15,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Link href="/field" className="shrink-0 p-1 -ml-1" style={{ color: "#64748b" }}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm leading-tight truncate">{apt.property.name}</div>
              <div className="text-xs truncate" style={{ color: "#64748b" }}>
                {apt.property.addressLine1}, {apt.property.city}
              </div>
            </div>
            <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
              style={
                isComplete  ? { background: "rgba(34,197,94,0.15)",  color: "#22c55e"  } :
                isCheckedIn ? { background: "rgba(168,85,247,0.15)", color: "#a855f7"  } :
                isEnRoute   ? { background: "rgba(59,130,246,0.15)", color: "#3b82f6"  } :
                              { background: "rgba(100,116,139,0.15)",color: "#64748b"  }
              }>
              {apt.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

          {/* ── Check-in / En Route card ── */}
          <div className="rounded-2xl p-4" style={DARK.card}>
            {isCheckedIn || isComplete ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#64748b" }}>Checked in</div>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: "#0ABAB5" }} />
                    {apt.actualStartTime ? format(new Date(apt.actualStartTime), "h:mm a") : "—"}
                    {apt.actualEndTime && (
                      <span style={{ color: "#64748b" }}>→ {format(new Date(apt.actualEndTime), "h:mm a")}</span>
                    )}
                  </div>
                </div>
                {isComplete && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                    Complete
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-white">
                  <Clock className="h-4 w-4" style={{ color: "#64748b" }} />
                  <div>
                    <div className="font-medium">Scheduled {format(new Date(apt.scheduledDate), "h:mm a")}</div>
                    <div className="text-xs" style={{ color: "#64748b" }}>{format(new Date(apt.scheduledDate), "EEE, MMM d, yyyy")}</div>
                  </div>
                </div>

                {/* En Route + Directions row */}
                <div className="flex gap-2">
                  {isPre && (
                    <button
                      onClick={markEnRoute}
                      disabled={goingEnRoute}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}
                    >
                      <Navigation className="h-4 w-4" style={{ color: "#3b82f6" }} />
                      {goingEnRoute ? "…" : "On My Way"}
                    </button>
                  )}
                  <a
                    href={mapsUrl}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
                  >
                    <MapPin className="h-4 w-4" /> Directions
                  </a>
                </div>

                {(isPre || isEnRoute) && (
                  <button
                    onClick={checkIn}
                    disabled={checkingIn}
                    className="w-full py-3 rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "#0ABAB5" }}
                  >
                    {checkingIn ? "Checking in…" : "✓ Check In & Begin Inspection"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Customer card ── */}
          <div className="rounded-2xl p-4 space-y-2.5" style={DARK.card}>
            <div className="font-semibold text-white text-sm">
              {apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`}
            </div>
            {apt.customer.companyName && (
              <div className="text-xs" style={{ color: "#64748b" }}>
                {apt.customer.firstName} {apt.customer.lastName}
              </div>
            )}
            {apt.customer.phone && (
              <a href={`tel:${apt.customer.phone}`} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#0ABAB5" }}>
                <Phone className="h-4 w-4" />
                {apt.customer.phone}
              </a>
            )}
            <InfoRow icon={<MapPin className="h-4 w-4" />}>
              <div>{apt.property.addressLine1}</div>
              <div style={{ color: "#64748b" }}>{apt.property.city}, {apt.property.state} {apt.property.zip}</div>
            </InfoRow>
          </div>

          {/* ── Access / Special Instructions ── */}
          {(apt.accessNotes || apt.specialInstructions) && (
            <div className="space-y-2">
              {apt.accessNotes && (
                <div className="rounded-xl px-4 py-3" style={DARK.cardAmber}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#fbbf24" }}>🔑 Access Notes</div>
                  <div className="text-sm" style={{ color: "#fde68a" }}>{apt.accessNotes}</div>
                </div>
              )}
              {apt.specialInstructions && (
                <div className="rounded-xl px-4 py-3" style={DARK.cardRed}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#f87171" }}>⚠️ Special Instructions</div>
                  <div className="text-sm" style={{ color: "#fca5a5" }}>{apt.specialInstructions}</div>
                </div>
              )}
            </div>
          )}

          {/* ── K9 Team ── */}
          {(dog || handler || apt.technician) && (
            <div className="rounded-2xl p-4 flex items-center gap-4" style={DARK.card}>
              {dog && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: "rgba(10,186,181,0.12)" }}>🐾</div>
                  <div>
                    <div className="font-semibold text-sm text-white">{dog.name}</div>
                    {dog.breed && <div className="text-xs" style={{ color: "#64748b" }}>{dog.breed}</div>}
                  </div>
                </div>
              )}
              {(handler || apt.technician) && (
                <div className="flex items-center gap-2 ml-auto">
                  <User className="h-4 w-4" style={{ color: "#64748b" }} />
                  <div className="text-sm text-white">
                    {handler ? `${handler.user.firstName} ${handler.user.lastName}` : apt.technician ? `${apt.technician.firstName} ${apt.technician.lastName}` : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Inspection section ── */}
          {(isCheckedIn || isComplete) && inspection && (
            <>
              {/* Tab bar — only shown when maps are relevant */}
              {hasMaps && (
                <div className="flex rounded-xl overflow-hidden p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={() => setActiveTab("inspection")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={activeTab === "inspection"
                      ? { background: "#0ABAB5", color: "#fff" }
                      : { color: "#64748b" }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isSiteWide ? "Observations" : "Inspection"}
                  </button>
                  <button
                    onClick={() => setActiveTab("map")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={activeTab === "map"
                      ? { background: "#0ABAB5", color: "#fff" }
                      : { color: "#64748b" }}
                  >
                    <MapIcon className="h-4 w-4" />
                    Site Map
                  </button>
                </div>
              )}

              {/* ── MAP TAB ── */}
              {activeTab === "map" && (
                <PropertyMapEditor
                  propertyId={apt.property.id}
                  serviceType={apt.serviceType}
                  initialMaps={(apt.propertyMaps ?? []) as Parameters<typeof PropertyMapEditor>[0]["initialMaps"]}
                  dark
                />
              )}

              {/* ── INSPECTION TAB ── */}
              {activeTab === "inspection" && (
                <>
                  {/* Progress */}
                  <div className="rounded-2xl p-4" style={DARK.card}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {isSiteWide ? (
                          <span className="text-sm font-semibold text-white">
                            {siteWideZoneCount} zone{siteWideZoneCount !== 1 ? "s" : ""} recorded
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-white">{completedCount} / {totalCount} units</span>
                        )}
                        {alertCount > 0 && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                            <AlertTriangle className="h-3 w-3" />{alertCount} alert{alertCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {!isSiteWide && totalCount > 0 && (
                        <span className="text-xs" style={{ color: "#64748b" }}>
                          {Math.round((completedCount / totalCount) * 100)}%
                        </span>
                      )}
                    </div>
                    {!isSiteWide && totalCount > 0 && (
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(completedCount / totalCount) * 100}%`, background: alertCount > 0 ? "#ef4444" : "#0ABAB5" }}
                        />
                      </div>
                    )}
                    {isSiteWide && (
                      <div className="text-xs mt-1" style={{ color: "#64748b" }}>
                        Site-wide survey — add observation zones below
                      </div>
                    )}
                  </div>

                  {/* Job Notes */}
                  <div className="rounded-2xl p-4" style={DARK.card}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" style={{ color: "#0ABAB5" }} />
                        <span className="text-xs font-semibold uppercase tracking-wide text-white">Job Notes</span>
                      </div>
                      {notesSaving && <span className="text-xs" style={{ color: "#64748b" }}>Saving…</span>}
                    </div>
                    <textarea
                      value={jobNotes}
                      onChange={(e) => saveNotes(e.target.value)}
                      placeholder="Overall observations, property conditions, access issues…"
                      rows={3}
                      disabled={isComplete}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none resize-none disabled:opacity-60"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>

                  {/* ─── SITE-WIDE MODE: Observation zones ─── */}
                  {isSiteWide && (
                    <div className="rounded-2xl p-4" style={DARK.card}>
                      <div className="text-sm font-semibold text-white mb-1">Observation Zones</div>
                      <div className="text-xs mb-4" style={{ color: "#64748b" }}>
                        Add zones to record observations for each area of the property.
                      </div>

                      {/* Zone list */}
                      {extraUnits.filter((u) => !u.unitNumber.match(/ ·\d+$/)).length > 0 && (
                        <div className="space-y-2 mb-3">
                          {extraUnits
                            .filter((u) => !u.unitNumber.match(/ ·\d+$/))
                            .sort((a, b) => naturalSort(a.unitNumber, b.unitNumber))
                            .map((zone) => {
                              const allZoneUnits = inspMap.get(zone.unitNumber) ?? [zone];
                              const result = worstResult(allZoneUnits);
                              const cfg = result ? RESULT_MAP[result] : null;
                              const photoCount = allZoneUnits.reduce((s, u) => s + u.photos.length, 0);
                              return (
                                <button
                                  key={zone.id}
                                  onClick={() => !isComplete && setEditingUnit(zone.unitNumber)}
                                  disabled={isComplete}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.99] disabled:opacity-70"
                                  style={cfg
                                    ? { borderColor: cfg.color, background: `${cfg.color}18` }
                                    : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                                >
                                  <span className="text-xl shrink-0">{cfg?.emoji ?? "⬜"}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{zone.unitNumber}</div>
                                    {cfg && <div className="text-xs mt-0.5" style={{ color: cfg.color }}>{cfg.label}</div>}
                                  </div>
                                  {photoCount > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>
                                      📷 {photoCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {!isComplete && (
                        <AddExtraEntry
                          inspectionId={inspection.id}
                          onAdded={async (unitNumber) => { await refreshInspection(); setEditingUnit(unitNumber); }}
                          buttonLabel="+ Add Observation Zone"
                          inputPlaceholder="e.g. North Pond, Parking Lot, Back Field"
                          promptText="Name this observation zone:"
                        />
                      )}
                    </div>
                  )}

                  {/* ─── UNIT-BASED MODE: Building grids ─── */}
                  {!isSiteWide && (
                    <>
                      {/* Unit grids by building */}
                      {apt.property.buildings.map((building) => (
                        <div key={building.id} className="rounded-2xl p-4" style={DARK.card}>
                          <BuildingHeader
                            building={building}
                            inspectedCount={[...building.units].filter((u) => (inspMap.get(u.unitNumber)?.length ?? 0) > 0).length}
                            onRenamed={(newName) => {
                              setApt((prev) => ({
                                ...prev,
                                property: {
                                  ...prev.property,
                                  buildings: prev.property.buildings.map((b) =>
                                    b.id === building.id ? { ...b, name: newName } : b
                                  ),
                                },
                              }));
                            }}
                            onDeleted={refreshProperty}
                          />
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
                          {!isComplete && (
                            <div className="mt-3">
                              <AddUnitToProperty
                                propertyId={apt.property.id}
                                buildingId={building.id}
                                onAdded={async (unitNumber) => { await refreshProperty(); if (unitNumber) setEditingUnit(unitNumber); }}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Standalone units */}
                      {(apt.property.units.length > 0 || apt.property.buildings.length === 0) && (
                        <div className="rounded-2xl p-4" style={DARK.card}>
                          <div className="text-sm font-semibold text-white mb-3">Units</div>
                          {apt.property.units.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {[...apt.property.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber)).map((unit) => (
                                <UnitTile
                                  key={unit.id}
                                  unit={unit}
                                  inspUnits={inspMap.get(unit.unitNumber) ?? []}
                                  onSelect={() => !isComplete && setEditingUnit(unit.unitNumber)}
                                />
                              ))}
                            </div>
                          )}
                          {!isComplete && (
                            <AddUnitToProperty
                              propertyId={apt.property.id}
                              buildingId={null}
                              onAdded={async (unitNumber) => { await refreshProperty(); if (unitNumber) setEditingUnit(unitNumber); }}
                            />
                          )}
                        </div>
                      )}

                      {/* Extra entry points */}
                      {extraUnits.length > 0 && (
                        <div className="rounded-2xl p-4" style={DARK.card}>
                          <div className="text-sm font-semibold text-white mb-3">Extra Entry Points</div>
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

                      {/* Add building */}
                      {!isComplete && (
                        <AddBuildingToProperty propertyId={apt.property.id} onAdded={refreshProperty} />
                      )}

                      {/* Add extra entry */}
                      {!isComplete && (
                        <AddExtraEntry
                          inspectionId={inspection.id}
                          onAdded={async (unitNumber) => { await refreshInspection(); setEditingUnit(unitNumber); }}
                        />
                      )}
                    </>
                  )}

                  {/* Complete button */}
                  {!isComplete && (isSiteWide ? siteWideZoneCount > 0 : completedCount > 0) && (
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
                </>
              )}
            </>
          )}

          {/* Pre-checkin placeholder */}
          {!isCheckedIn && !isComplete && (
            <div className="text-center py-8 text-sm" style={{ color: "#64748b" }}>
              Check in to begin the inspection
            </div>
          )}
        </div>
      </div>

      {/* ── Message Office floating button ── */}
      {!isComplete && !showOfficeNote && (
        <button
          onClick={() => setShowOfficeNote(true)}
          className="fixed z-30 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg font-semibold text-sm text-white"
          style={{ bottom: "88px", right: "16px", background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
        >
          ✉️ Message Office
          {officeNotes && <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />}
        </button>
      )}

      {/* ── Office Note Panel overlay ── */}
      {showOfficeNote && (
        <OfficeNotePanel
          appointmentId={apt.id}
          techName={apt.technician ? `${apt.technician.firstName} ${apt.technician.lastName}` : "Tech"}
          existingNotes={officeNotes}
          onClose={() => setShowOfficeNote(false)}
          onSent={(updated) => { setOfficeNotes(updated); setShowOfficeNote(false); }}
        />
      )}

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
          key={editingUnit}
          baseUnitNumber={editingUnit}
          inspectionId={inspection.id}
          existingUnits={inspMap.get(editingUnit) ?? []}
          onClose={() => setEditingUnit(null)}
          onSaved={refreshInspection}
          hasNext={!!nextUnit}
          onNext={() => { if (nextUnit) setEditingUnit(nextUnit); else setEditingUnit(null); }}
        />
      )}
    </>
  );
}
