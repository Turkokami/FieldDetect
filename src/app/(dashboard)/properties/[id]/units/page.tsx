"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Unit = {
  id: string;
  unitNumber: string;
  floor: number | null;
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

export default function PropertyUnitsPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [saving, setSaving] = useState(false);
  const [newUnit, setNewUnit] = useState({ unitNumber: "", floor: "", unitType: "RESIDENTIAL", buildingId: "" });
  const [bulkText, setBulkText] = useState("");
  const [bulkBuildingId, setBulkBuildingId] = useState("");

  const fetchProperty = useCallback(async () => {
    const res = await fetch(`/api/properties/${id}`);
    const data = await res.json();
    setProperty(data.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  const addSingleUnit = async () => {
    if (!newUnit.unitNumber.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/properties/${id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber: newUnit.unitNumber,
          floor: newUnit.floor ? parseInt(newUnit.floor) : null,
          unitType: newUnit.unitType,
          buildingId: newUnit.buildingId || null,
        }),
      });
      setNewUnit({ unitNumber: "", floor: "", unitType: "RESIDENTIAL", buildingId: "" });
      await fetchProperty();
    } finally {
      setSaving(false);
    }
  };

  const addBulkUnits = async () => {
    const lines = bulkText.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return;
    setSaving(true);
    try {
      const units = lines.map((line) => {
        const parts = line.split(/[\t,]/).map((p) => p.trim());
        return {
          unitNumber: parts[0],
          floor: parts[1] ? parseInt(parts[1]) : null,
          unitType: "RESIDENTIAL",
          buildingId: bulkBuildingId || null,
        };
      }).filter((u) => u.unitNumber);

      await fetch(`/api/properties/${id}/units/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units }),
      });
      setBulkText("");
      await fetchProperty();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!property) return <div className="p-6 text-foreground">Property not found</div>;

  const totalUnits = property.units.length + property.buildings.reduce((s, b) => s + b.units.length, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/properties/${id}`} className="text-muted-foreground hover:text-foreground text-sm">
            ← {property.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">Manage Units</h1>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Add Units
        </button>
      </div>

      <div className="text-sm text-muted-foreground">
        {totalUnits} total units across {property.buildings.length} buildings
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAddMode("single")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${addMode === "single" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
            >
              Single Unit
            </button>
            <button
              onClick={() => setAddMode("bulk")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${addMode === "bulk" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
            >
              Bulk Import
            </button>
          </div>

          {addMode === "single" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Unit Number *</label>
                <input
                  value={newUnit.unitNumber}
                  onChange={(e) => setNewUnit((u) => ({ ...u, unitNumber: e.target.value }))}
                  placeholder="101"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Floor</label>
                <input
                  value={newUnit.floor}
                  onChange={(e) => setNewUnit((u) => ({ ...u, floor: e.target.value }))}
                  placeholder="1"
                  type="number"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Building</label>
                <select
                  value={newUnit.buildingId}
                  onChange={(e) => setNewUnit((u) => ({ ...u, buildingId: e.target.value }))}
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
                  onClick={addSingleUnit}
                  disabled={saving}
                  className="w-full h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste unit numbers, one per line. Optionally include floor: &quot;101, 1&quot; or &quot;101\t1&quot;
              </p>
              {property.buildings.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Assign to Building</label>
                  <select
                    value={bulkBuildingId}
                    onChange={(e) => setBulkBuildingId(e.target.value)}
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
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"101\n102\n103\n201\n202"}
                rows={8}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={addBulkUnits}
                disabled={saving || !bulkText.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Importing..." : `Import Units`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Buildings */}
      <div className="space-y-4">
        {property.buildings.map((building) => (
          <div key={building.id} className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">
              {building.name}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({building.units.length} units)
              </span>
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-14 gap-1.5">
              {building.units.map((unit) => (
                <div
                  key={unit.id}
                  className="aspect-square flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs font-medium text-foreground hover:bg-primary/10 cursor-default"
                  title={`Unit ${unit.unitNumber}${unit.floor ? ` · Floor ${unit.floor}` : ""}`}
                >
                  {unit.unitNumber}
                </div>
              ))}
            </div>
          </div>
        ))}

        {property.units.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">
              Unassigned Units
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({property.units.length})
              </span>
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-14 gap-1.5">
              {property.units.map((unit) => (
                <div
                  key={unit.id}
                  className="aspect-square flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs font-medium text-foreground"
                >
                  {unit.unitNumber}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
