"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  HelpCircle,
  Lock,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Camera,
  Edit2,
} from "lucide-react";

const RESULT_CONFIG = {
  NEGATIVE: {
    label: "Negative",
    shortLabel: "NEG",
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    badge: "negative" as const,
  },
  POSITIVE_K9_ALERT: {
    label: "K9 Alert",
    shortLabel: "K9+",
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
    badge: "positive" as const,
  },
  VISUAL_CONFIRMATION: {
    label: "Visual Confirm",
    shortLabel: "VIS",
    icon: Eye,
    bg: "bg-red-100",
    border: "border-red-400",
    text: "text-red-900",
    badge: "positive" as const,
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    shortLabel: "INC",
    icon: HelpCircle,
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    badge: "inconclusive" as const,
  },
  UNABLE_TO_INSPECT: {
    label: "Unable",
    shortLabel: "UNB",
    icon: Ban,
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    badge: "secondary" as const,
  },
  ACCESS_DENIED: {
    label: "No Access",
    shortLabel: "NAC",
    icon: Lock,
    bg: "bg-slate-50",
    border: "border-slate-300",
    text: "text-slate-700",
    badge: "secondary" as const,
  },
  FOLLOW_UP_REQUIRED: {
    label: "Follow-Up",
    shortLabel: "FUP",
    icon: RefreshCw,
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    badge: "warning" as const,
  },
};

interface UnitResult {
  id: string;
  unitNumber: string;
  buildingName?: string;
  floor?: string;
  unitType: string;
  occupant?: string;
  detectionResult: string;
  severityLevel: string;
  alertLocation?: string;
  visualEvidence: boolean;
  technicianNotes?: string;
  recommendations?: string;
  followUpRequired: boolean;
  photos: { id: string; url: string; caption?: string }[];
}

interface UnitResultsGridProps {
  inspectionId: string;
  units: Record<string, unknown>[];
  canEdit: boolean;
  onUnitsUpdated: () => void;
}

function UnitCard({ unit, canEdit, inspectionId, onUpdate }: {
  unit: UnitResult;
  canEdit: boolean;
  inspectionId: string;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState(unit.detectionResult);
  const [notes, setNotes] = useState(unit.technicianNotes ?? "");
  const [saving, setSaving] = useState(false);

  const config = RESULT_CONFIG[result as keyof typeof RESULT_CONFIG] ?? RESULT_CONFIG.NEGATIVE;
  const Icon = config.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inspection-units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detectionResult: result, technicianNotes: notes }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Unit updated");
      setEditing(false);
      onUpdate();
    } catch {
      toast.error("Failed to update unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("rounded-lg border-2 transition-all", config.border, config.bg)}>
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("p-1.5 rounded-md bg-white/80")}>
              <Icon className={cn("h-4 w-4", config.text)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  {unit.buildingName ? `${unit.buildingName} ` : ""}{unit.unitNumber}
                </span>
                {unit.floor && (
                  <span className="text-xs text-slate-500">Floor {unit.floor}</span>
                )}
                {unit.followUpRequired && (
                  <span className="text-xs text-orange-600 font-medium">Follow-up</span>
                )}
              </div>
              {unit.occupant && (
                <p className="text-xs text-slate-500 truncate">{unit.occupant}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={config.badge} className="hidden sm:flex">
              {config.label}
            </Badge>
            <span className={cn("text-xs font-bold sm:hidden", config.text)}>
              {config.shortLabel}
            </span>
            {unit.photos.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                <Camera className="h-3 w-3" />
                {unit.photos.length}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/50 space-y-3">
          {editing ? (
            <div className="space-y-3 pt-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Detection Result</label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger className="h-8 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-sm min-h-[80px] bg-white"
                  placeholder="Technician observations..."
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="pt-3 space-y-2">
              {unit.alertLocation && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Alert Location</p>
                  <p className="text-sm text-slate-800">{unit.alertLocation}</p>
                </div>
              )}
              {unit.technicianNotes && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Notes</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{unit.technicianNotes}</p>
                </div>
              )}
              {unit.recommendations && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Recommendations</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{unit.recommendations}</p>
                </div>
              )}
              {unit.photos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Photos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {unit.photos.map((photo) => (
                      <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                        <img
                          src={photo.url}
                          alt={photo.caption ?? "Inspection photo"}
                          className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="mt-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit Result
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UnitResultsGrid({ inspectionId, units, canEdit, onUnitsUpdated }: UnitResultsGridProps) {
  const typedUnits = units as unknown as UnitResult[];

  if (typedUnits.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-200">
        <p className="text-slate-500 text-sm">No units added yet</p>
        <p className="text-slate-400 text-xs mt-1">Click "Add Units" to begin logging inspection results</p>
      </div>
    );
  }

  // Group by building
  const groups = typedUnits.reduce((acc, unit) => {
    const key = unit.buildingName ?? "—";
    if (!acc[key]) acc[key] = [];
    acc[key].push(unit);
    return acc;
  }, {} as Record<string, UnitResult[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([building, bUnits]) => (
        <div key={building}>
          {Object.keys(groups).length > 1 && (
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Building: {building}
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bUnits.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                canEdit={canEdit}
                inspectionId={inspectionId}
                onUpdate={onUnitsUpdated}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
