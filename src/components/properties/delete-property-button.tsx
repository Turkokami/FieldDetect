"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete property");
      }
      toast.success("Property deleted");
      router.push("/properties");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
        <span className="text-sm text-destructive font-medium">Delete {propertyName}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1 text-xs font-semibold bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1 text-xs font-semibold border border-border rounded-md hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-2 text-sm font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
    >
      Delete
    </button>
  );
}
