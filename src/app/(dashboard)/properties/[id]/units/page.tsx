"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Building2, Hash, Layers, Plus, Trash2, Eye } from "lucide-react";

type Unit = {
  id: string;
  unitNumber: string;
  floor: string | null;
  unitType: string;
  buildingId: string | null;
};

type Building = {
  id: string;
  name: string;
  units: Unit[];
};

type Property = {
  id: string;
  name: string;
  buildings: Building[];
  units: Unit[];
};

const PREFIXES = [
  { label: "Unit",   value: "Unit" },
  { label: "Room",   value: "Room" },
  { label: "Apt",    value: "Apt" },
  { label: "Suite",  value: "Suite" },
  { label: "Floor",  value: "Floor" },
  { label: "Lvl",    value: "Lvl" },
  { label: "Area",   value: "Area" },
  { label: "# only", value: ""     },
  { label: "Custom", value: "__custom__" },
];

const SEPARATORS = [
  { label: "Dash (Unit-1)",  value: "-"  },
  { label: "Space (Unit 1)", value: " "  },
  { label: "None (Unit1)",   value: ""   },
];

const UNIT_TYPES = [
  { label: "Apartment",   value: "APARTMENT"   },
  { label: "Hotel Room",  value: "HOTEL_ROOM"  },
  { label: "Dorm Room",   value: "DORM_ROOM"   },
  { label: "Office",      value: "OFFICE"      },
  { label: "Suite",       value: "SUITE"       },
  { label: "Floor",       value: "FLOOR"       },
  { label: "Area",        value: "AREA"        },
  { label: "Common Area", value: "COMMON_AREA" },
  { label: "Other",       value: "OTHER"       },
];

type AddMode = "single" | "generate" | "paste";

export default function PropertyUnitsPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<AddMode>("generate");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single unit
  const [single, setSingle] = useState({ unitNumber: "", floor: "", unitType: "APARTMENT", buildingId: "" });

  // Generate range
  const [gen, setGen] = useState({
    buildingId: "",
    newBuildingName: "",
    useNewBuilding: false,
    prefix: "Unit",
    customPrefix: "",
    separator: "-",
    start: "1",
    end: "20",
    floor: "",
    unitType: "APARTMENT",
    padZeros: false,
    padLength: "3",
  });
  const [showPreview, setShowPreview] = useState(false);

  // Paste
  const [pasteText, setPasteText] = useState("");
  const [pasteBuildingId, setPasteBuildingId] = useState("");

  const fetchProperty = useCallback(async () => {
    const res = await fetch(`/api/properties/${id}`);
    const data = await res.json();
    setProperty(data.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  // Generated preview
  const generatedUnits = useMemo(() => {
    const start = parseInt(gen.start) || 1;
    const end = parseInt(gen.end) || 1;
    if (end < start || end - start > 999) return [];

    const prefix = gen.prefix === "__custom__" ? gen.customPrefix : gen.prefix;
    const pad = gen.padZeros ? parseInt(gen.padLength) || 3 : 0;

    return Array.from({ length: end - start + 1 }, (_, i) => {
      const num = start + i;
      const numStr = pad > 0 ? String(num).padStart(pad, "0") : String(num);
      return prefix ? `${prefix}${gen.separator}${numStr}` : numStr;
    });
  }, [gen]);

  const totalUnits = property
    ? property.units.length + property.buildings.reduce((s, b) => s + b.units.length, 0)
    : 0;

  const addSingle = async () => {
    if (!single.unitNumber.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber: single.unitNumber.trim(),
          floor: single.floor ? parseInt(single.floor, 10) : null,
          unitType: single.unitType,
          buildingId: single.buildingId || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to add unit."); return; }
      setSingle({ unitNumber: "", floor: "", unitType: "APARTMENT", buildingId: "" });
      await fetchProperty();
    } finally { setSaving(false); }
  };

  const generateRange = async () => {
    if (generatedUnits.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      let buildingId = gen.buildingId || null;

      if (gen.useNewBuilding && gen.newBuildingName.trim()) {
        const res = await fetch(`/api/properties/${id}/buildings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: gen.newBuildingName.trim() }),
        });
        if (!res.ok) { setError("Failed to create building."); return; }
        const data = await res.json();
        buildingId = data.data?.id ?? null;
      }

      const floorNum = gen.floor ? parseInt(gen.floor, 10) : null;
      const res = await fetch(`/api/properties/${id}/units/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: generatedUnits.map((unitNumber) => ({
            unitNumber,
            floor: floorNum,
            unitType: gen.unitType,
            buildingId,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create units.");
        return;
      }

      setShowPreview(false);
      setGen((g) => ({ ...g, useNewBuilding: false, newBuildingName: "", buildingId: buildingId ?? "" }));
      await fetchProperty();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally { setSaving(false); }
  };

  const importPaste = async () => {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setSaving(true);
    try {
      await fetch(`/api/properties/${id}/units/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: lines.map((unitNumber) => ({
            unitNumber,
            unitType: "APARTMENT",
            buildingId: pasteBuildingId || null,
          })),
        }),
      });
      setPasteText("");
      await fetchProperty();
    } finally { setSaving(false); }
  };

  const deleteUnit = async (unitId: string) => {
    await fetch(`/api/properties/${id}/units/${unitId}`, { method: "DELETE" });
    await fetchProperty();
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!property) return <div className="p-6 text-foreground">Property not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/properties/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {property.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">Manage Units</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "#0ABAB5" }}
        >
          <Plus className="h-4 w-4" />
          Add Units
        </button>
      </div>

      <div className="text-sm text-muted-foreground">
        {totalUnits} total units · {property.buildings.length} building{property.buildings.length !== 1 ? "s" : ""}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
            {(["generate", "single", "paste"] as AddMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "generate" ? "Generate Range" : m === "single" ? "Single Unit" : "Paste List"}
              </button>
            ))}
          </div>

          {/* ── Generate Range ── */}
          {mode === "generate" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Building */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Building
                  </label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gen.useNewBuilding}
                        onChange={(e) => setGen((g) => ({ ...g, useNewBuilding: e.target.checked }))}
                        className="rounded border-border"
                      />
                      Create new building
                    </label>
                  </div>
                  {gen.useNewBuilding ? (
                    <input
                      value={gen.newBuildingName}
                      onChange={(e) => setGen((g) => ({ ...g, newBuildingName: e.target.value }))}
                      placeholder="e.g. Building A"
                      className="mt-2 w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <select
                      value={gen.buildingId}
                      onChange={(e) => setGen((g) => ({ ...g, buildingId: e.target.value }))}
                      className="mt-2 w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">No building (standalone units)</option>
                      {property.buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Prefix + Separator */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Unit Label
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={gen.prefix}
                      onChange={(e) => setGen((g) => ({ ...g, prefix: e.target.value }))}
                      className="flex-1 h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {PREFIXES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <select
                      value={gen.separator}
                      onChange={(e) => setGen((g) => ({ ...g, separator: e.target.value }))}
                      className="flex-1 h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {SEPARATORS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  {gen.prefix === "__custom__" && (
                    <input
                      value={gen.customPrefix}
                      onChange={(e) => setGen((g) => ({ ...g, customPrefix: e.target.value }))}
                      placeholder="Custom prefix…"
                      className="mt-2 w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>

                {/* Range */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Number Range
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={gen.start}
                      onChange={(e) => setGen((g) => ({ ...g, start: e.target.value }))}
                      placeholder="1"
                      min="1"
                      className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <input
                      type="number"
                      value={gen.end}
                      onChange={(e) => setGen((g) => ({ ...g, end: e.target.value }))}
                      placeholder="154"
                      min="1"
                      className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Floor + Type */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Floor (optional)
                  </label>
                  <input
                    value={gen.floor}
                    onChange={(e) => setGen((g) => ({ ...g, floor: e.target.value }))}
                    placeholder="e.g. 1"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Unit Type
                  </label>
                  <select
                    value={gen.unitType}
                    onChange={(e) => setGen((g) => ({ ...g, unitType: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Pad zeros */}
                <div className="sm:col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gen.padZeros}
                      onChange={(e) => setGen((g) => ({ ...g, padZeros: e.target.checked }))}
                      className="rounded border-border"
                    />
                    Zero-pad numbers
                  </label>
                  {gen.padZeros && (
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-muted-foreground">digits:</span>
                      <input
                        type="number"
                        value={gen.padLength}
                        onChange={(e) => setGen((g) => ({ ...g, padLength: e.target.value }))}
                        min="2" max="6"
                        className="w-16 h-8 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-muted-foreground text-xs">(e.g. Unit-001)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live preview */}
              {generatedUnits.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        Preview — {generatedUnits.length} units
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPreview ? "Hide all" : "Show all"}
                    </button>
                  </div>

                  {showPreview ? (
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {generatedUnits.map((u) => (
                        <span key={u} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono">
                          {u}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-foreground font-mono">
                      {generatedUnits[0]}
                      {generatedUnits.length > 2 && <span className="text-muted-foreground"> … </span>}
                      {generatedUnits.length > 1 && generatedUnits[generatedUnits.length - 1]}
                    </div>
                  )}
                </div>
              )}

              {generatedUnits.length === 0 && (parseInt(gen.end) - parseInt(gen.start)) > 999 && (
                <p className="text-xs text-destructive">Maximum 1,000 units per batch.</p>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={generateRange}
                disabled={saving || generatedUnits.length === 0}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "#0ABAB5" }}
              >
                {saving ? "Creating…" : `Create ${generatedUnits.length} Units`}
              </button>
            </div>
          )}

          {/* ── Single Unit ── */}
          {mode === "single" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-foreground mb-1">Unit Number *</label>
                <input
                  value={single.unitNumber}
                  onChange={(e) => setSingle((s) => ({ ...s, unitNumber: e.target.value }))}
                  placeholder="101"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Floor</label>
                <input
                  value={single.floor}
                  onChange={(e) => setSingle((s) => ({ ...s, floor: e.target.value }))}
                  placeholder="1"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Building</label>
                <select
                  value={single.buildingId}
                  onChange={(e) => setSingle((s) => ({ ...s, buildingId: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">No building</option>
                  {property.buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={addSingle}
                  disabled={saving}
                  className="w-full h-9 rounded-md text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#0ABAB5" }}
                >
                  {saving ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* ── Paste List ── */}
          {mode === "paste" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste unit numbers one per line. Useful for importing from a spreadsheet.
              </p>
              {property.buildings.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Assign to Building</label>
                  <select
                    value={pasteBuildingId}
                    onChange={(e) => setPasteBuildingId(e.target.value)}
                    className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">No building</option>
                    {property.buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"101\n102\n103\n201\n202\n…"}
                rows={8}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={importPaste}
                  disabled={saving || !pasteText.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#0ABAB5" }}
                >
                  {saving ? "Importing…" : `Import ${pasteText.split("\n").filter((l) => l.trim()).length} Units`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buildings + Units display */}
      <div className="space-y-4">
        {property.buildings.map((building) => (
          <div key={building.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {building.name}
                <span className="text-sm font-normal text-muted-foreground">({building.units.length} units)</span>
              </h3>
            </div>
            {building.units.length > 0 ? (
              <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-14 gap-1.5">
                {building.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="aspect-square flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs font-medium text-foreground hover:border-destructive/50 hover:bg-destructive/5 group relative"
                    title={`${unit.unitNumber}${unit.floor ? ` · Floor ${unit.floor}` : ""}`}
                  >
                    <span className="group-hover:invisible">{unit.unitNumber}</span>
                    <button
                      onClick={() => deleteUnit(unit.id)}
                      className="absolute inset-0 hidden group-hover:flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No units yet.</p>
            )}
          </div>
        ))}

        {property.units.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">
              Unassigned Units
              <span className="text-sm font-normal text-muted-foreground ml-2">({property.units.length})</span>
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-14 gap-1.5">
              {property.units.map((unit) => (
                <div
                  key={unit.id}
                  className="aspect-square flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs font-medium text-foreground group relative hover:border-destructive/50"
                  title={unit.unitNumber}
                >
                  <span className="group-hover:invisible">{unit.unitNumber}</span>
                  <button
                    onClick={() => deleteUnit(unit.id)}
                    className="absolute inset-0 hidden group-hover:flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalUnits === 0 && !showForm && (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">No units yet</p>
            <p className="text-sm text-muted-foreground">Use "Generate Range" to quickly add units in bulk.</p>
          </div>
        )}
      </div>
    </div>
  );
}
