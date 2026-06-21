"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";

function NewPropertyContent() {
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get("customerId") ?? "";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">New Property</h1>
      <PropertyForm prefillCustomerId={prefillCustomerId} />
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <NewPropertyContent />
    </Suspense>
  );
}
