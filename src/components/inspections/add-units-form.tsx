"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Upload } from "lucide-react";

interface UnitRow {
  unitNumber: string;
  buildingName: string;
  floor: string;
  unitType: string;
  detectionResult: string;
  occupant: string;
}

const DEFAULT_ROW: UnitRow = {
  unitNumber: "",
  buildingName: "",
  floor: "",
  unitType: "APARTMENT",
  detectionResult: "NEGATIVE",
  occupant: "",
};

interface AddUnitsFormProps {
  inspectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUnitsForm({ inspectionId, onClose, onSuccess }: AddUnitsFormProps) {
  const [units, setUnits] = useState<UnitRow[]>([{ ...DEFAULT_ROW }]);
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const addRow = () => setUnits((prev) => [...prev, { ...DEFAULT_ROW }]);
  const removeRow = (idx: number) => setUnits((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof UnitRow, value: string) => {
    setUnits((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const parseBulkText = () => {
    const lines = bulkText.trim().split("\n").filter(Boolean);
    const parsed: UnitRow[] = lines.map((line) => {
      const parts = line.split(/[\t,]/);
      return {
        unitNumber: parts[0]?.trim() ?? "",
        buildingName: parts[1]?.trim() ?? "",
        floor: parts[2]?.trim() ?? "",
        unitType: "APARTMENT",
        detectionResult: "NEGATIVE",
        occupant: parts[3]?.trim() ?? "",
      };
    });
    setUnits(parsed.filter((u) => u.unitNumber));
    setShowBulk(false);
  };

  const handleSubmit = async () => {
    const valid = units.filter((u) => u.unitNumber.trim());
    if (valid.length === 0) {
      toast.error("Add at least one unit");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: valid.map((u, idx) => ({ ...u, sortOrder: idx })),
          replaceAll: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to add units");
      toast.success(`Added ${valid.length} units`);
      onSuccess();
    } catch {
      toast.error("Failed to add units");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inspection Units</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBulk(!showBulk)}
            >
              <Upload className="h-3.5 w-3.5" />
              Bulk Import
            </Button>
          </div>

          {showBulk && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
              <p className="text-xs text-slate-600">
                Paste unit data (one per line): UnitNumber, Building, Floor, Occupant
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"101, Building A, 1st, John Smith\n102, Building A, 1st\n201, Building B, 2nd"}
                className="w-full h-32 text-sm font-mono p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={parseBulkText}>Parse Units</Button>
            </div>
          )}

          {/* Header */}
          <div className="grid grid-cols-12 gap-1.5 text-xs font-medium text-slate-500 px-1">
            <div className="col-span-2">Unit #</div>
            <div className="col-span-2">Building</div>
            <div className="col-span-1">Floor</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Result</div>
            <div className="col-span-1">Occupant</div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
            {units.map((unit, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-2">
                  <Input
                    value={unit.unitNumber}
                    onChange={(e) => updateRow(idx, "unitNumber", e.target.value)}
                    placeholder="101"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={unit.buildingName}
                    onChange={(e) => updateRow(idx, "buildingName", e.target.value)}
                    placeholder="Bldg A"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    value={unit.floor}
                    onChange={(e) => updateRow(idx, "floor", e.target.value)}
                    placeholder="1"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Select value={unit.unitType} onValueChange={(v) => updateRow(idx, "unitType", v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APARTMENT">Apt</SelectItem>
                      <SelectItem value="HOTEL_ROOM">Hotel Rm</SelectItem>
                      <SelectItem value="DORM_ROOM">Dorm Rm</SelectItem>
                      <SelectItem value="OFFICE">Office</SelectItem>
                      <SelectItem value="ROOM">Room</SelectItem>
                      <SelectItem value="COMMON_AREA">Common</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Select value={unit.detectionResult} onValueChange={(v) => updateRow(idx, "detectionResult", v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEGATIVE">Negative</SelectItem>
                      <SelectItem value="POSITIVE_K9_ALERT">K9 Alert</SelectItem>
                      <SelectItem value="VISUAL_CONFIRMATION">Visual Confirm</SelectItem>
                      <SelectItem value="INCONCLUSIVE">Inconclusive</SelectItem>
                      <SelectItem value="UNABLE_TO_INSPECT">Unable</SelectItem>
                      <SelectItem value="ACCESS_DENIED">No Access</SelectItem>
                      <SelectItem value="FOLLOW_UP_REQUIRED">Follow-Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Input
                    value={unit.occupant}
                    onChange={(e) => updateRow(idx, "occupant", e.target.value)}
                    placeholder="Name"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    disabled={units.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            Add {units.filter((u) => u.unitNumber.trim()).length} Units
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
