"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Photo = { id: string; url: string };
type InspectionUnit = {
  id: string;
  unitNumber: string;
  result: string | null;
  notes: string | null;
  photos: Photo[];
};

type Unit = {
  id: string;
  unitNumber: string;
  buildingId: string | null;
};

type Building = {
  id: string;
  name: string;
  units: Unit[];
};

type Property = {
  id: string;
  buildings: Building[];
  units: Unit[];
};

type Inspection = {
  id: string;
  inspectionUnits: InspectionUnit[];
};

type Appointment = {
  id: string;
  status: string;
  property: Property;
  inspection: Inspection | null;
};

const RESULTS = [
  { value: "NEGATIVE", label: "Negative", emoji: "✅", color: "border-green-300 bg-green-50 text-green-700" },
  { value: "POSITIVE_K9_ALERT", label: "K9 Alert", emoji: "🚨", color: "border-red-300 bg-red-50 text-red-700" },
  { value: "VISUAL_CONFIRMATION", label: "Visual +", emoji: "👁️", color: "border-red-400 bg-red-100 text-red-800" },
  { value: "INCONCLUSIVE", label: "Inconclusive", emoji: "❓", color: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  { value: "UNABLE_TO_INSPECT", label: "No Access", emoji: "🚫", color: "border-gray-300 bg-gray-50 text-gray-600" },
  { value: "ACCESS_DENIED", label: "Denied", emoji: "⛔", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: "FOLLOW_UP_REQUIRED", label: "Follow-Up", emoji: "📋", color: "border-blue-300 bg-blue-50 text-blue-700" },
];

const RESULT_COLORS: Record<string, string> = {
  NEGATIVE: "bg-green-100 text-green-800 border-green-200",
  POSITIVE_K9_ALERT: "bg-red-100 text-red-800 border-red-200",
  VISUAL_CONFIRMATION: "bg-red-200 text-red-900 border-red-300",
  INCONCLUSIVE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  UNABLE_TO_INSPECT: "bg-gray-100 text-gray-700 border-gray-200",
  ACCESS_DENIED: "bg-orange-100 text-orange-800 border-orange-200",
  FOLLOW_UP_REQUIRED: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function FieldInspectionView({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(appointment.inspection);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeResult, setActiveResult] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState("");
  const [showResultPicker, setShowResultPicker] = useState(false);

  const allPropertyUnits = [
    ...appointment.property.units,
    ...appointment.property.buildings.flatMap((b) => b.units),
  ];

  const inspectionMap = new Map(
    inspection?.inspectionUnits.map((u) => [u.unitNumber, u]) ?? []
  );

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
    setActiveResult(existing?.result ?? null);
    setActiveNotes(existing?.notes ?? "");
    setShowResultPicker(true);
  }, [inspectionMap]);

  const saveUnitResult = async (result: string) => {
    if (!inspection || !selectedUnit) return;
    setSaving(true);
    setShowResultPicker(false);

    const existing = inspectionMap.get(selectedUnit);

    try {
      if (existing) {
        // Update existing
        await fetch(`/api/inspection-units/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result, notes: activeNotes || null }),
        });
      } else {
        // Create new unit
        await fetch(`/api/inspections/${inspection.id}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            units: [{
              unitNumber: selectedUnit,
              result,
              notes: activeNotes || null,
            }],
          }),
        });
      }

      // Refresh inspection data
      const res = await fetch(`/api/inspections/${inspection.id}`);
      const data = await res.json();
      setInspection(data.data);
    } finally {
      setSaving(false);
      setSelectedUnit(null);
      setActiveResult(null);
      setActiveNotes("");
    }
  };

  const completedCount = inspectionMap.size;
  const totalCount = allPropertyUnits.length;

  if (!inspection) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">🔍</div>
        <h3 className="font-semibold text-foreground mb-2">Ready to Inspect</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tap Start to begin recording unit results.
        </p>
        <button
          onClick={startInspection}
          disabled={starting}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {starting ? "Starting..." : "Start Inspection"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-foreground">Progress</span>
          <span className="text-muted-foreground">{completedCount} / {totalCount || "?"} units</span>
        </div>
        {totalCount > 0 && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Buildings & Units Grid */}
      {appointment.property.buildings.length > 0 ? (
        <div className="space-y-3">
          {appointment.property.buildings.map((building) => (
            <div key={building.id} className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{building.name}</h3>
              <div className="grid grid-cols-4 gap-2">
                {building.units.map((unit) => {
                  const insp = inspectionMap.get(unit.unitNumber);
                  return (
                    <button
                      key={unit.id}
                      onClick={() => selectUnit(unit.unitNumber)}
                      className={`aspect-square rounded-lg border-2 text-sm font-bold flex items-center justify-center transition-all active:scale-95 ${
                        insp?.result ? RESULT_COLORS[insp.result] : "border-border bg-background text-foreground"
                      }`}
                    >
                      {unit.unitNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {appointment.property.units.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Other Units</h3>
              <div className="grid grid-cols-4 gap-2">
                {appointment.property.units.map((unit) => {
                  const insp = inspectionMap.get(unit.unitNumber);
                  return (
                    <button
                      key={unit.id}
                      onClick={() => selectUnit(unit.unitNumber)}
                      className={`aspect-square rounded-lg border-2 text-sm font-bold flex items-center justify-center transition-all active:scale-95 ${
                        insp?.result ? RESULT_COLORS[insp.result] : "border-border bg-background text-foreground"
                      }`}
                    >
                      {unit.unitNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground text-center">
            No units defined for this property.
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Add units from the property management page.
          </p>
        </div>
      )}

      {/* Result Picker Modal */}
      {showResultPicker && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg">Unit {selectedUnit}</h3>
              <button
                onClick={() => setShowResultPicker(false)}
                className="text-muted-foreground text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {RESULTS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setActiveResult(r.value);
                    saveUnitResult(r.value);
                  }}
                  disabled={saving}
                  className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 disabled:opacity-50 ${
                    activeResult === r.value ? r.color + " border-current" : "border-border bg-background"
                  }`}
                >
                  <div className="text-xl mb-1">{r.emoji}</div>
                  <div className={`text-xs font-semibold ${activeResult === r.value ? "" : "text-foreground"}`}>
                    {r.label}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
              <textarea
                value={activeNotes}
                onChange={(e) => setActiveNotes(e.target.value)}
                placeholder="Observations, evidence found..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {saving && (
              <div className="text-center text-sm text-muted-foreground">Saving...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
