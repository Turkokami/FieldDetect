"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dog, User, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type Photo = { id: string; url: string };
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
  { value: "NEGATIVE",           label: "Negative",     emoji: "✅", border: "#22c55e", bg: "#052e16", text: "#4ade80" },
  { value: "POSITIVE_K9_ALERT",  label: "K9 Alert",     emoji: "🚨", border: "#ef4444", bg: "#1c0a0a", text: "#f87171" },
  { value: "VISUAL_CONFIRMATION",label: "Visual +",     emoji: "👁️", border: "#dc2626", bg: "#2a0a0a", text: "#fca5a5" },
  { value: "INCONCLUSIVE",       label: "Inconclusive", emoji: "❓", border: "#eab308", bg: "#1c1a00", text: "#fde047" },
  { value: "UNABLE_TO_INSPECT",  label: "No Access",    emoji: "🚫", border: "#64748b", bg: "#0f172a", text: "#94a3b8" },
  { value: "ACCESS_DENIED",      label: "Denied",       emoji: "⛔", border: "#f97316", bg: "#1c0f00", text: "#fb923c" },
  { value: "FOLLOW_UP_REQUIRED", label: "Follow-Up",    emoji: "📋", border: "#3b82f6", bg: "#0a1628", text: "#60a5fa" },
];

const UNIT_DOT: Record<string, string> = {
  NEGATIVE:            "#22c55e",
  POSITIVE_K9_ALERT:   "#ef4444",
  VISUAL_CONFIRMATION: "#dc2626",
  INCONCLUSIVE:        "#eab308",
  UNABLE_TO_INSPECT:   "#64748b",
  ACCESS_DENIED:       "#f97316",
  FOLLOW_UP_REQUIRED:  "#3b82f6",
};

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

  const dog = appointment.k9Team?.dogs[0];
  const handler = appointment.k9Team?.members.find((m) => m.isPrimary);

  const allPropertyUnits: Unit[] = [
    ...appointment.property.units,
    ...appointment.property.buildings.flatMap((b) => b.units),
  ];

  const inspectionMap = new Map(
    inspection?.inspectionUnits.map((u) => [u.unitNumber, u]) ?? []
  );

  const completedCount = inspectionMap.size;
  const totalCount = allPropertyUnits.length;
  const alertCount = [...inspectionMap.values()].filter(
    (u) => u.detectionResult === "POSITIVE_K9_ALERT" || u.detectionResult === "VISUAL_CONFIRMATION"
  ).length;

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
  }, [inspectionMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveUnitResult = async (resultValue: string) => {
    if (!inspection || !selectedUnit) return;
    setSaving(true);
    setShowPicker(false);

    const existing = inspectionMap.get(selectedUnit);
    try {
      if (existing) {
        await fetch(`/api/inspection-units/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            detectionResult: resultValue,
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
              detectionResult: resultValue,
              technicianNotes: activeNotes || null,
            }],
          }),
        });
      }

      const res = await fetch(`/api/inspections/${inspection.id}`);
      const data = await res.json();
      if (data.data) setInspection(data.data);
    } finally {
      setSaving(false);
      setSelectedUnit(null);
      setActiveResult(null);
      setActiveNotes("");
    }
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

  if (!inspection) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* K9 Team info */}
        {(dog || handler) && (
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            {dog && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: "rgba(10,186,181,0.12)" }}>
                  🐾
                </div>
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

  return (
    <div className="space-y-4">
      {/* K9 Team + Progress header */}
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

      {/* Unit grid by building */}
      {appointment.property.buildings.length > 0 ? (
        <div className="space-y-3">
          {appointment.property.buildings.map((building) => (
            <UnitGrid
              key={building.id}
              title={building.name}
              units={building.units}
              inspectionMap={inspectionMap}
              onSelect={selectUnit}
            />
          ))}
          {appointment.property.units.length > 0 && (
            <UnitGrid
              title="Other Units"
              units={appointment.property.units}
              inspectionMap={inspectionMap}
              onSelect={selectUnit}
            />
          )}
        </div>
      ) : appointment.property.units.length > 0 ? (
        <UnitGrid
          title="Units"
          units={appointment.property.units}
          inspectionMap={inspectionMap}
          onSelect={selectUnit}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No units defined for this property.{" "}
          <a href={`/properties/${appointment.property.id}/units`} className="underline">Add units</a>
        </div>
      )}

      {/* Complete inspection button */}
      {completedCount > 0 && (
        <button
          onClick={completeInspection}
          disabled={completing}
          className="w-full py-3.5 rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: alertCount > 0 ? "#ef4444" : "#0ABAB5" }}
        >
          {completing ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Completing…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Complete Inspection
              {alertCount > 0 && ` (${alertCount} Alert${alertCount > 1 ? "s" : ""})`}
            </>
          )}
        </button>
      )}

      {/* Result picker bottom sheet */}
      {showPicker && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPicker(false)} />
          <div className="relative bg-card rounded-t-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg">Unit {selectedUnit}</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {RESULTS.map((r) => {
                const isSelected = activeResult === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => { setActiveResult(r.value); saveUnitResult(r.value); }}
                    disabled={saving}
                    className="p-3.5 rounded-xl border-2 text-left transition-all active:scale-95 disabled:opacity-50"
                    style={
                      isSelected
                        ? { borderColor: r.border, background: r.bg }
                        : { borderColor: "transparent", background: "rgba(255,255,255,0.04)" }
                    }
                  >
                    <div className="text-2xl mb-1">{r.emoji}</div>
                    <div className="text-xs font-semibold" style={isSelected ? { color: r.text } : { color: "inherit" }}>
                      {r.label}
                    </div>
                  </button>
                );
              })}
            </div>

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

            {saving && (
              <div className="text-center text-sm text-muted-foreground">Saving…</div>
            )}
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
          return (
            <button
              key={unit.id}
              onClick={() => onSelect(unit.unitNumber)}
              className="aspect-square rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-2"
              style={
                resultColor
                  ? { borderColor: resultColor, background: `${resultColor}18`, color: resultColor }
                  : { borderColor: "transparent", background: "rgba(255,255,255,0.05)", color: "inherit" }
              }
            >
              <span>{unit.unitNumber}</span>
              {insp?.detectionResult && (
                <span className="text-[9px] font-normal opacity-70">
                  {insp.detectionResult === "NEGATIVE" ? "✓" :
                   insp.detectionResult === "POSITIVE_K9_ALERT" ? "🚨" :
                   insp.detectionResult === "VISUAL_CONFIRMATION" ? "👁" :
                   insp.detectionResult === "INCONCLUSIVE" ? "?" :
                   insp.detectionResult === "FOLLOW_UP_REQUIRED" ? "📋" : "✕"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
