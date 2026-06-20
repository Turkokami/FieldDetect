"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const schema = z.object({
  overallResult: z.enum([
    "NEGATIVE", "POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION",
    "INCONCLUSIVE", "UNABLE_TO_INSPECT", "ACCESS_DENIED", "FOLLOW_UP_REQUIRED",
  ]),
  summaryNotes: z.string().optional(),
  recommendations: z.string().optional(),
  followUpRequired: z.boolean(),
  followUpDate: z.string().optional(),
  treatmentReferral: z.boolean(),
  endTime: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CompleteInspectionModalProps {
  inspectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompleteInspectionModal({ inspectionId, onClose, onSuccess }: CompleteInspectionModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormData>,
    defaultValues: {
      overallResult: "NEGATIVE",
      followUpRequired: false,
      treatmentReferral: false,
      endTime: new Date().toISOString().slice(0, 16),
    },
  });
  const { register, handleSubmit, setValue, watch } = form;

  const overallResult = watch("overallResult");
  const followUpRequired = watch("followUpRequired");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
          followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to complete inspection");
      toast.success("Inspection completed!");
      onSuccess();
    } catch {
      toast.error("Failed to complete inspection");
    } finally {
      setLoading(false);
    }
  };

  const isPositive = ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"].includes(overallResult);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Inspection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Overall Result *</Label>
              <Select
                value={overallResult}
                onValueChange={(v) => setValue("overallResult", v as FormData["overallResult"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEGATIVE">Negative — No Detection</SelectItem>
                  <SelectItem value="POSITIVE_K9_ALERT">Positive K9 Alert</SelectItem>
                  <SelectItem value="VISUAL_CONFIRMATION">Visual Confirmation</SelectItem>
                  <SelectItem value="INCONCLUSIVE">Inconclusive</SelectItem>
                  <SelectItem value="UNABLE_TO_INSPECT">Unable to Inspect</SelectItem>
                  <SelectItem value="FOLLOW_UP_REQUIRED">Follow-Up Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>End Time</Label>
              <Input {...register("endTime")} type="datetime-local" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Summary Notes</Label>
            <Textarea
              {...register("summaryNotes")}
              placeholder="Overall observations and findings..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Recommendations</Label>
            <Textarea
              {...register("recommendations")}
              placeholder="Recommended actions for the customer..."
              className="min-h-[80px]"
            />
          </div>

          {/* Flags */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="followUpRequired"
                {...register("followUpRequired")}
                className="rounded border-slate-300"
              />
              <label htmlFor="followUpRequired" className="text-sm font-medium">
                Follow-Up Inspection Required
              </label>
            </div>
            {followUpRequired && (
              <div className="space-y-1.5 ml-6">
                <Label className="text-xs">Suggested Follow-Up Date</Label>
                <Input {...register("followUpDate")} type="date" className="h-8 text-sm max-w-[200px]" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="treatmentReferral"
                {...register("treatmentReferral")}
                className="rounded border-slate-300"
              />
              <label htmlFor="treatmentReferral" className="text-sm font-medium">
                Treatment Referral Recommended
              </label>
            </div>
          </div>

          {isPositive && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                ⚠ Positive detection recorded. Consider recommending treatment and follow-up inspection.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} variant="success">
              Complete Inspection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
