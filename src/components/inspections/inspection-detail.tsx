"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitResultsGrid } from "@/components/inspections/unit-results-grid";
import { AddUnitsForm } from "@/components/inspections/add-units-form";
import { CompleteInspectionModal } from "@/components/inspections/complete-inspection-modal";
import { formatDateTime, formatDate } from "@/lib/utils";
import {
  Building2,
  User,
  Dog,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MinusCircle,
  FileText,
  Receipt,
  Plus,
  Camera,
} from "lucide-react";
import Link from "next/link";

type AvailableDog = {
  id: string;
  name: string;
  breed: string | null;
  k9Team: { name: string };
};

interface InspectionDetailProps {
  inspection: Record<string, unknown>;
  currentUserId: string;
  currentUserRole: string;
  availableDogs?: AvailableDog[];
}

const DETECTION_COLORS: Record<string, string> = {
  NEGATIVE: "bg-green-50 border-green-200 text-green-800",
  POSITIVE_K9_ALERT: "bg-red-50 border-red-200 text-red-800",
  VISUAL_CONFIRMATION: "bg-red-50 border-red-300 text-red-900",
  INCONCLUSIVE: "bg-yellow-50 border-yellow-200 text-yellow-800",
  UNABLE_TO_INSPECT: "bg-slate-50 border-slate-200 text-slate-600",
  ACCESS_DENIED: "bg-slate-50 border-slate-300 text-slate-700",
  FOLLOW_UP_REQUIRED: "bg-orange-50 border-orange-200 text-orange-800",
};

const DETECTION_LABEL: Record<string, string> = {
  NEGATIVE: "Negative",
  POSITIVE_K9_ALERT: "K9 Alert",
  VISUAL_CONFIRMATION: "Visual Confirmation",
  INCONCLUSIVE: "Inconclusive",
  UNABLE_TO_INSPECT: "Unable to Inspect",
  ACCESS_DENIED: "Access Denied",
  FOLLOW_UP_REQUIRED: "Follow-Up Required",
};

export function InspectionDetail({ inspection, currentUserId, currentUserRole, availableDogs = [] }: InspectionDetailProps) {
  const router = useRouter();
  const [showAddUnits, setShowAddUnits] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showAssignDog, setShowAssignDog] = useState(false);
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [assigningDog, setAssigningDog] = useState(false);

  const insp = inspection as {
    id: string;
    inspectionNumber: string;
    startTime: string;
    endTime?: string;
    serviceType: string;
    totalUnitsInspected: number;
    totalPositive: number;
    totalNegative: number;
    totalInconclusive: number;
    totalInaccessible: number;
    overallResult?: string;
    summaryNotes?: string;
    recommendations?: string;
    followUpRequired: boolean;
    followUpDate?: string;
    treatmentReferral: boolean;
    weather?: string;
    k9DogId?: string | null;
    k9Dog?: { id: string; name: string; breed?: string };
    k9Team?: { name: string };
    technician: { firstName: string; lastName: string };
    property: {
      name: string;
      addressLine1: string;
      city: string;
      state: string;
      zip: string;
      propertyType: string;
      customer: { firstName: string; lastName: string; companyName?: string; phone?: string; email?: string };
    };
    inspectionUnits: unknown[];
    invoice?: { id: string; invoiceNumber: string; status: string; totalAmount: number } | null;
    reportUrl?: string;
  };

  const isComplete = !!insp.endTime;
  const canEdit = !isComplete || ["OWNER", "ADMIN"].includes(currentUserRole);

  const assignDog = async () => {
    setAssigningDog(true);
    try {
      const res = await fetch(`/api/inspections/${insp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k9DogId: selectedDogId || null }),
      });
      if (!res.ok) { toast.error("Failed to assign dog"); return; }
      toast.success(selectedDogId ? "Dog assigned" : "Dog removed");
      setShowAssignDog(false);
      router.refresh();
    } finally {
      setAssigningDog(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">
              Inspection Report
            </h1>
            {isComplete ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Complete
              </Badge>
            ) : (
              <Badge variant="warning" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                In Progress
              </Badge>
            )}
          </div>
          <p className="text-slate-500 text-sm font-mono">{insp.inspectionNumber}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!isComplete && (
            <Button onClick={() => setShowComplete(true)} variant="success">
              <CheckCircle className="h-4 w-4" />
              Complete Inspection
            </Button>
          )}
          {isComplete && !insp.invoice && (
            <Button asChild variant="outline">
              <Link href={`/invoices/new?inspectionId=${insp.id}`}>
                <Receipt className="h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          )}
          {isComplete && (
            <Button asChild variant="outline">
              <Link href={`/reports/${insp.id}`}>
                <FileText className="h-4 w-4" />
                View Report
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Summary info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Property/Customer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Customer & Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {insp.property.customer.companyName ??
                      `${insp.property.customer.firstName} ${insp.property.customer.lastName}`}
                  </p>
                  {insp.property.customer.phone && (
                    <p className="text-xs text-slate-500">{insp.property.customer.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{insp.property.name}</p>
                  <p className="text-xs text-slate-500">
                    {insp.property.addressLine1}, {insp.property.city}, {insp.property.state}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Inspection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium">{formatDate(insp.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start</span>
                <span className="font-medium">
                  {new Date(insp.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {insp.endTime && (
                <div className="flex justify-between">
                  <span className="text-slate-500">End</span>
                  <span className="font-medium">
                    {new Date(insp.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Technician</span>
                <span className="font-medium">
                  {insp.technician.firstName} {insp.technician.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Dog className="h-3 w-3" /> K9
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">
                    {insp.k9Dog ? insp.k9Dog.name : <span className="text-slate-400 italic">Unassigned</span>}
                  </span>
                  {canEdit && availableDogs.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedDogId(insp.k9DogId ?? "");
                        setShowAssignDog(true);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {insp.k9Dog ? "Change" : "Assign"}
                    </button>
                  )}
                </div>
              </div>
              {insp.weather && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Weather</span>
                  <span className="font-medium">{insp.weather}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Results Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Total Units
                </span>
                <span className="font-bold">{insp.totalUnitsInspected}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Positive Detections
                </span>
                <span className="font-bold text-red-700">{insp.totalPositive}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Negative
                </span>
                <span className="font-bold text-green-700">{insp.totalNegative}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-yellow-600">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Inconclusive
                </span>
                <span className="font-bold text-yellow-700">{insp.totalInconclusive}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  Inaccessible
                </span>
                <span className="font-bold text-slate-600">{insp.totalInaccessible}</span>
              </div>

              {insp.overallResult && (
                <div className={`mt-3 p-2 rounded border text-center text-sm font-medium ${
                  DETECTION_COLORS[insp.overallResult] ?? "bg-slate-50 border-slate-200"
                }`}>
                  Overall: {DETECTION_LABEL[insp.overallResult] ?? insp.overallResult}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flags */}
          {(insp.followUpRequired || insp.treatmentReferral) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 space-y-2">
                {insp.followUpRequired && (
                  <div className="flex items-center gap-2 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Follow-up required
                      {insp.followUpDate && ` · ${formatDate(insp.followUpDate)}`}
                    </span>
                  </div>
                )}
                {insp.treatmentReferral && (
                  <div className="flex items-center gap-2 text-red-800 text-sm">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Treatment referral recommended</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invoice link */}
          {insp.invoice && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">{insp.invoice.invoiceNumber}</p>
                    <p className="text-xs text-green-700">{insp.invoice.status}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/invoices/${insp.invoice.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Unit results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Unit Results
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({insp.inspectionUnits.length} units)
              </span>
            </h2>
            {canEdit && (
              <Button onClick={() => setShowAddUnits(true)} size="sm">
                <Plus className="h-4 w-4" />
                Add Units
              </Button>
            )}
          </div>

          <UnitResultsGrid
            inspectionId={insp.id}
            units={insp.inspectionUnits as Record<string, unknown>[]}
            canEdit={canEdit}
            onUnitsUpdated={() => router.refresh()}
          />
        </div>
      </div>

      {/* Summary / Recommendations */}
      {(insp.summaryNotes || insp.recommendations) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insp.summaryNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Summary Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{insp.summaryNotes}</p>
              </CardContent>
            </Card>
          )}
          {insp.recommendations && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{insp.recommendations}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddUnits && (
        <AddUnitsForm
          inspectionId={insp.id}
          onClose={() => setShowAddUnits(false)}
          onSuccess={() => {
            setShowAddUnits(false);
            router.refresh();
          }}
        />
      )}

      {showComplete && (
        <CompleteInspectionModal
          inspectionId={insp.id}
          onClose={() => setShowComplete(false)}
          onSuccess={() => {
            setShowComplete(false);
            router.refresh();
          }}
        />
      )}

      {showAssignDog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Assign K9 Dog</h2>
            <div>
              <label className="text-sm text-slate-600 block mb-1.5">Select dog</label>
              <select
                value={selectedDogId}
                onChange={(e) => setSelectedDogId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— None —</option>
                {availableDogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name}{dog.breed ? ` (${dog.breed})` : ""} · {dog.k9Team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAssignDog(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={assignDog}
                disabled={assigningDog}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {assigningDog ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
