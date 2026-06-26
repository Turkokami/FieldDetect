"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing-client";
import { toast } from "sonner";

type Props = {
  logoUrl: string | null;
  brandColor: string | null;
  canEdit: boolean;
};

const PRESET_COLORS = [
  "#0ABAB5", "#0D9488", "#2563EB", "#7C3AED",
  "#DC2626", "#D97706", "#16A34A", "#0F172A",
];

export default function BrandingSection({ logoUrl, brandColor, canEdit }: Props) {
  const router = useRouter();
  const [currentLogo, setCurrentLogo] = useState(logoUrl ?? "");
  const [color, setColor] = useState(brandColor ?? "#0ABAB5");
  const [savingColor, setSavingColor] = useState(false);
  const [savedColor, setSavedColor] = useState(false);

  const { startUpload, isUploading } = useUploadThing("orgLogo");

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await startUpload([file]);
      const f = uploaded?.[0];
      const url = f?.ufsUrl ?? f?.url ?? (f?.serverData as { url: string } | null)?.url;
      if (url) {
        // Client got the URL directly — also patch settings in case server-side save missed
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl: url }),
        });
        setCurrentLogo(url);
        toast.success("Logo updated");
        router.refresh();
      } else {
        // Server saved it via onUploadComplete — just refresh to pick up the new logo
        toast.success("Logo uploaded — refreshing…");
        router.refresh();
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const removeLogo = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error();
      setCurrentLogo("");
      toast.success("Logo removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove logo");
    }
  };

  const saveColor = async () => {
    setSavingColor(true);
    setSavedColor(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandColor: color }),
      });
      if (!res.ok) throw new Error();
      setSavedColor(true);
      toast.success("Brand color saved");
      router.refresh();
    } catch {
      toast.error("Failed to save brand color");
    } finally {
      setSavingColor(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      {/* Logo */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Company Logo</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {currentLogo ? (
              <img src={currentLogo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl">🐾</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {canEdit && (
              <>
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 h-9 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {isUploading ? "Uploading…" : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={isUploading} />
                </label>
                {currentLogo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-xs text-destructive hover:underline text-left"
                  >
                    Remove logo
                  </button>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground">PNG or JPG, max 4 MB. Used on invoices, emails, and reports.</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Brand Color */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Brand Color</h3>
        <p className="text-xs text-muted-foreground mb-3">Applied to the sidebar, invoices, emails, and PDF reports.</p>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Preset swatches */}
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={!canEdit}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-lg border-2 transition-all disabled:pointer-events-none"
              style={{
                background: c,
                borderColor: color === c ? "#fff" : "transparent",
                boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
              }}
              title={c}
            />
          ))}

          {/* Custom color picker */}
          {canEdit && (
            <label className="relative cursor-pointer w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-foreground/40 transition-colors" title="Custom color">
              <span className="text-xs text-muted-foreground">+</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          )}

          {/* Current hex display */}
          <div className="flex items-center gap-2 ml-2">
            <div className="w-5 h-5 rounded" style={{ background: color }} />
            <span className="text-sm font-mono text-foreground">{color.toUpperCase()}</span>
          </div>
        </div>

        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={saveColor}
              disabled={savingColor}
              className="px-5 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {savingColor ? "Saving…" : "Save Color"}
            </button>
            {savedColor && <span className="text-sm text-green-600">Saved</span>}
          </div>
        )}
      </div>
    </div>
  );
}
