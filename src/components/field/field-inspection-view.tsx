"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dog, User, CheckCircle2, AlertTriangle, Clock, Camera, Plus, X, Trash2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";

type Photo = { id: string; url: string; filename: string };
type InspectionUnit = {
  id: string;
  unitNumber: string;
  detectionResult: string | null;
  technicianNotes: string | null;
  photos: Photo[];
};
type Unit = { id: string; unitNumber: string; buildingId: string | null };
type Building = { id: string; name: string; units: Unit[] };
type Property = { id: string; buildings: Building[]; units: Unit[] };
type Inspection = { id: string; inspectionUnits: InspectionUnit[] };
type Dog_ = { id: string; name: string; breed: string | null };
type Member = { isPrimary: boolean; user: { firstName: string; lastName: string } };
type K9Team = { id: string; name: string; dogs: Dog_[]; members: Member[] } | null;

type Appointment = {
  id: string;
  status: string;
  property: Property;
  inspection: Inspection | null;
  technician?: { firstName: string; lastName: string } | null;
  k9Team?: K9Team;
};

const RESULTS = [
  { value: "NEGATIVE",            label: "Negative",     emoji: "✅", border: "#22c55e", bg: "#052e16", text: "#4ade80" },
  { value: "POSITIVE_K9_ALERT",   label: "K9 Alert",     emoji: "🚨", border: "#ef4444", bg: "#1c0a0a", text: "#f87171" },
  { value: "VISUAL_CONFIRMATION", label: "Visual +",     emoji: "👁️", border: "#dc2626", bg: "#2a0a0a", text: "#fca5a5" },
  { value: "INCONCLUSIVE",        label: "Inconclusive", emoji: "❓", border: "#eab308", bg: "#1c1a00", text: "#fde047" },
  { value: "UNABLE_TO_INSPECT",   label: "No Access",    emoji: "🚫", border: "#64748b", bg: "#0f172a", text: "#94a3b8" },
  { value: "ACCESS_DENIED",       label: "Denied",       emoji: "⛔", border: "#f97316", bg: "#1c0f00", text: "#fb923c" },
  { value: "FOLLOW_UP_REQUIRED",  label: "Follow-Up",    emoji: "📋", border: "#3b82f6", bg: "#0a1628", text: "#60a5fa" },
];

const RESULT_MAP = Object.fromEntries(RESULTS.map((r) => [r.value, r]));

const UNIT_DOT: Record<string, string> = {
  NEGATIVE:            "#22c55e",
  POSITIVE_K9_ALERT:   "#ef4444",
  VISUAL_CONFIRMATION: "#dc2626",
  INCONCLUSIVE:        "#eab308",
  UNABLE_TO_INSPECT:   "#64748b",
  ACCESS_DENIED:       "#f97316",
  FOLLOW_UP_REQUIRED:  "#3b82f6",
};

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function FieldInspectionView({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(appointment.inspection);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [activeResult, setActiveResult] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newEntryLabel, setNewEntryLabel] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("inspectionPhoto");

  const dog = appointment.k9Team?.dogs[0];
  const handler = appointment.k9Team?.members.find((m) => m.isPrimary);

  // All property units as a flat set for lookup
  const propertyUnitNumbers = new Set<string>([
    ...appointment.property.units.map((u) => u.unitNumber),
    ...appointment.property.buildings.flatMap((b) => b.units.map((u) => u.unitNumber)),
  ]);

  const inspectionMap = new Map(
    inspection?.inspectionUnits.map((u) => [u.unitNumber, u]) ?? []
  );

  // Extra inspection units not in property unit list (added doors/entries)
  const extraInspectionUnits = inspection?.inspectionUnits.filter(
    (u) => !propertyUnitNumbers.has(u.unitNumber)
  ) ?? [];

  const totalCount = propertyUnitNumbers.size + extraInspectionUnits.length;
  const completedCount = inspectionMap.size;
  const alertCount = [...inspectionMap.values()].filter(
    (u) => u.detectionResult === "POSITIVE_K9_ALERT" || u.detectionResult === "VISUAL_CONFIRMATION"
  ).length;

  const refreshInspection = async (inspectionId: string) => {
    const res = await fetch(`/api/inspections/${inspectionId}`);
    const data = await res.json();
    if (data.data) setInspection(data.data);
  };

  const startInspection = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id }),
      });
      const data = await res.json();
      if (data.data) {
        setInspection({ id: data.data.id, inspectionUnits: [] });
        router.refresh();
      }
    } finally {
      setStarting(false);
    }
  };

  const selectUnit = useCallback((unitNumber: string) => {
    const existing = inspectionMap.get(unitNumber);
    setSelectedUnit(unitNumber);
    setActiveResult(existing?.detectionResult ?? null);
    setActiveNotes(existing?.technicianNotes ?? "");
    setShowPicker(true);
    setShowAddEntry(false);
    setNewEntryLabel("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection]);

  const saveUnitResult = async () => {
    if (!inspection || !selectedUnit || !activeResult) return;
    setSaving(true);
    try {
      const existing = inspectionMap.get(selectedUnit);
      if (existing) {
        await fetch(`/api/inspection-units/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            detectionResult: activeResult,
            technicianNotes: activeNotes || null,
          }),
        });
      } else {
        await fetch(`/api/inspections/${inspection.id}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            units: [{
              unitNumber: selectedUnit,
              detectionResult: activeResult,
              technicianNotes: activeNotes || null,
            }],
          }),
        });
      }
      await refreshInspection(inspection.id);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!inspection || !selectedUnit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Ensure the unit is saved first before attaching photos
    const existing = inspectionMap.get(selectedUnit);
    if (!existing) {
      alert("Save the result first, then add photos.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]) return;
      const { ufsUrl, key, name } = uploaded[0];
      await fetch(`/api/inspection-units/${existing.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ufsUrl, key, filename: name }),
      });
      await refreshInspection(inspection.id);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deletePhoto = async (photoId: string, unitId: string) => {
    await fetch(`/api/inspection-units/${unitId}/photos?photoId=${photoId}`, { method: "DELETE" });
    if (inspection) await refreshInspection(inspection.id);
  };

  const addExtraEntry = async () => {
    if (!inspection || !newEntryLabel.trim()) return;
    const label = newEntryLabel.trim();
    setSaving(true);
    try {
      await fetch(`/api/inspections/${inspection.id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: [{
            unitNumber: label,
            detectionResult: "NEGATIVE",
            technicianNotes: null,
          }],
        }),
      });
      await refreshInspection(inspection.id);
      setNewEntryLabel("");
      setShowAddEntry(false);
      // Open the newly created entry
      setSelectedUnit(label);
      setActiveResult("NEGATIVE");
      setActiveNotes("");
      setShowPicker(true);
    } finally {
      setSaving(false);
    }
  };

  const closePicker = () => {
    setShowPicker(false);
    setSelectedUnit(null);
    setActiveResult(null);
    setActiveNotes("");
    setShowAddEntry(false);
    setNewEntryLabel("");
  };

  const completeInspection = async () => {
    setCompleting(true);
    try {
      await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INSPECTION_COMPLETE" }),
      });
      router.push(`/inspections/${inspection!.id}`);
    } finally {
      setCompleting(false);
    }
  };

  // ─── Not yet started ──────────────────────────────────────────────────────
  if (!inspection) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {(dog || handler) && (
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            {dog && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: "rgba(10,186,181,0.12)" }}>🐾</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{dog.name}</div>
                  {dog.breed && <div className="text-xs text-muted-foreground">{dog.breed}</div>}
                </div>
              </div>
            )}
            {handler && (
              <div className="flex items-center gap-2 ml-auto">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-foreground">
                  {handler.user.firstName} {handler.user.lastName}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-semibold text-foreground text-lg mb-1">Ready to Inspect</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Tap Start to begin recording results unit by unit.
          </p>
          <button
            onClick={startInspection}
            disabled={starting}
            className="w-full py-3.5 rounded-xl font-semibold text-base text-white transition-colors disabled:opacity-50"
            style={{ background: "#0ABAB5" }}
          >
            {starting ? "Starting…" : "Start Inspection"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Active inspection ─────────────────────────────────────────────────────
  const currentInspUnit = selectedUnit ? inspectionMap.get(selectedUnit) : undefined;

  return (
    <div className="space-y-4">
      {/* K9 Team + Progress */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {(dog || handler || appointment.technician) && (
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border"
            style={{ background: "rgba(10,186,181,0.05)" }}>
            {dog && (
              <div className="flex items-center gap-2">
                <Dog className="h-4 w-4" style={{ color: "#0ABAB5" }} />
                <span className="text-sm font-semibold text-foreground">{dog.name}</span>
                {dog.breed && <span className="text-xs text-muted-foreground">{dog.breed}</span>}
              </div>
            )}
            {(handler || appointment.technician) && (
              <div className="flex items-center gap-1.5 ml-auto text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {handler
                  ? `${handler.user.firstName} ${handler.user.lastName}`
                  : appointment.technician
                  ? `${appointment.technician.firstName} ${appointment.technician.lastName}`
                  : null}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {completedCount} / {totalCount || "?"} units
              </span>
              {alertCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  {alertCount} alert{alertCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {Math.round((completedCount / totalCount) * 100)}%
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                  background: alertCount > 0 ? "#ef4444" : "#0ABAB5",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Unit grids */}
      {appointment.property.buildings.length > 0 ? (
        <div className="space-y-3">
          {appointment.property.buildings.map((building) => (
            <UnitGrid
              key={building.id}
              title={building.name}
              units={[...building.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber))}
              inspectionMap={inspectionMap}
              onSelect={selectUnit}
            />
          ))}
          {appointment.property.units.length > 0 && (
            <UnitGrid
              title="Other Units"
              units={[...appointment.property.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber))}
              inspectionMap={inspectionMap}
              onSelect={selectUnit}
            />
          )}
        </div>
      ) : appointment.property.units.length > 0 ? (
        <UnitGrid
          title="Units"
          units={[...appointment.property.units].sort((a, b) => naturalSort(a.unitNumber, b.unitNumber))}
          inspectionMap={inspectionMap}
          onSelect={selectUnit}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No units defined for this property.{" "}
          <a href={`/properties/${appointment.property.id}/units`} className="underline">Add units</a>
        </div>
      )}

      {/* Extra entry points */}
      {extraInspectionUnits.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Extra Entry Points</h3>
          <div className="grid grid-cols-4 gap-2">
            {extraInspectionUnits
              .sort((a, b) => naturalSort(a.unitNumber, b.unitNumber))
              .map((u) => {
                const resultColor = u.detectionResult ? UNIT_DOT[u.detectionResult] : null;
                return (
                  <button
                    key={u.id}
                    onClick={() => selectUnit(u.unitNumber)}
                    className="aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-2 p-1"
                    style={
                      resultColor
                        ? { borderColor: resultColor, background: `${resultColor}18`, color: resultColor }
                        : { borderColor: "transparent", background: "rgba(255,255,255,0.05)", color: "inherit" }
                    }
                  >
                    <span className="leading-tight text-center">{u.unitNumber}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Add extra entry point */}
      <button
        onClick={() => setShowAddEntry(true)}
        className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Entry Point (Door, Common Area, etc.)
      </button>

      {/* Inline add entry form */}
      {showAddEntry && !showPicker && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Name this entry point (e.g. "Lobby", "Boiler Room", "Unit-5 Back Door")</p>
          <div className="flex gap-2">
            <input
              value={newEntryLabel}
              onChange={(e) => setNewEntryLabel(e.target.value)}
              placeholder="e.g. Unit-12 Back Door"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => e.key === "Enter" && addExtraEntry()}
              autoFocus
            />
            <button
              onClick={addExtraEntry}
              disabled={!newEntryLabel.trim() || saving}
              className="px-4 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#0ABAB5" }}
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddEntry(false); setNewEntryLabel(""); }}
              className="px-3 h-9 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Complete button */}
      {completedCount > 0 && (
        <button
          onClick={completeInspection}
          disabled={completing}
          className="w-full py-3.5 rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: alertCount > 0 ? "#ef4444" : "#0ABAB5" }}
        >
          {completing ? (
            <><Clock className="h-4 w-4 animate-spin" />Completing…</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" />
              Complete Inspection{alertCount > 0 && ` (${alertCount} Alert${alertCount > 1 ? "s" : ""})`}
            </>
          )}
        </button>
      )}

      {/* ─── Unit result sheet ─── */}
      {showPicker && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closePicker} />
          <div className="relative bg-card rounded-t-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h3 className="font-bold text-foreground text-lg">{selectedUnit}</h3>
              <button
                onClick={closePicker}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-6 space-y-5">
              {/* Result grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {RESULTS.map((r) => {
                  const isSelected = activeResult === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => setActiveResult(r.value)}
                      className="p-3.5 rounded-xl border-2 text-left transition-all active:scale-95"
                      style={
                        isSelected
                          ? { borderColor: r.border, background: r.bg }
                          : { borderColor: "transparent", background: "rgba(255,255,255,0.04)" }
                      }
                    >
                      <div className="text-2xl mb-1">{r.emoji}</div>
                      <div className="text-xs font-semibold" style={isSelected ? { color: r.text } : {}}>
                        {r.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <textarea
                  value={activeNotes}
                  onChange={(e) => setActiveNotes(e.target.value)}
                  placeholder="Observations, location of alert, evidence found…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Save button */}
              <button
                onClick={saveUnitResult}
                disabled={!activeResult || saving}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: "#0ABAB5" }}
              >
                {saving ? "Saving…" : currentInspUnit ? "Update Result" : "Save Result"}
              </button>

              {/* Photos — only shown once unit has been saved */}
              {currentInspUnit && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Photos {currentInspUnit.photos.length > 0 && `(${currentInspUnit.photos.length})`}
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {uploadingPhoto ? "Uploading…" : "Add Photo"}
                    </button>
                  </div>

                  {currentInspUnit.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {currentInspUnit.photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.filename}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => deletePhoto(photo.id, currentInspUnit.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hidden group-hover:flex items-center justify-center"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentInspUnit.photos.length === 0 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 transition-colors"
                    >
                      <Camera className="h-5 w-5" />
                      <span className="text-xs">Tap to add a photo</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                </div>
              )}

              {/* Add sub-entry (door) */}
              {currentInspUnit && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Additional Entry Points</span>
                    <button
                      onClick={() => setShowAddEntry(!showAddEntry)}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Door
                    </button>
                  </div>

                  {showAddEntry && (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newEntryLabel}
                        onChange={(e) => setNewEntryLabel(e.target.value)}
                        placeholder={`e.g. ${selectedUnit} – Back Door`}
                        className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        onKeyDown={(e) => e.key === "Enter" && addExtraEntry()}
                        autoFocus
                      />
                      <button
                        onClick={addExtraEntry}
                        disabled={!newEntryLabel.trim() || saving}
                        className="px-3 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "#0ABAB5" }}
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Show related extra entries for this unit */}
                  {extraInspectionUnits
                    .filter((u) => u.unitNumber.startsWith(selectedUnit))
                    .map((u) => {
                      const cfg = u.detectionResult ? RESULT_MAP[u.detectionResult] : null;
                      return (
                        <button
                          key={u.id}
                          onClick={() => selectUnit(u.unitNumber)}
                          className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="text-sm">{cfg?.emoji ?? "⬜"}</span>
                          <span className="flex-1 text-sm text-foreground">{u.unitNumber}</span>
                          {cfg && (
                            <span className="text-xs font-medium" style={{ color: cfg.text }}>
                              {cfg.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitGrid({
  title,
  units,
  inspectionMap,
  onSelect,
}: {
  title: string;
  units: Unit[];
  inspectionMap: Map<string, InspectionUnit>;
  onSelect: (unitNumber: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="grid grid-cols-4 gap-2">
        {units.map((unit) => {
          const insp = inspectionMap.get(unit.unitNumber);
          const resultColor = insp?.detectionResult ? UNIT_DOT[insp.detectionResult] : null;
          const cfg = insp?.detectionResult ? RESULT_MAP[insp.detectionResult] : null;
          return (
            <button
              key={unit.id}
              onClick={() => onSelect(unit.unitNumber)}
              className="aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-2 relative"
              style={
                resultColor
                  ? { borderColor: resultColor, background: `${resultColor}18`, color: resultColor }
                  : { borderColor: "transparent", background: "rgba(255,255,255,0.05)", color: "inherit" }
              }
            >
              <span className="text-[11px] leading-tight px-1 text-center">{unit.unitNumber}</span>
              {cfg && (
                <span className="text-[10px]">{cfg.emoji}</span>
              )}
              {insp?.photos && insp.photos.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">
                  {insp.photos.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
