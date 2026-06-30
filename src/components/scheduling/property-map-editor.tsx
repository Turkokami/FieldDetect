"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-client";

type MarkerPhoto = { url: string; key: string };

type MapMarker = {
  id: string;
  type: string;
  x: number;
  y: number;
  label?: string;
  count?: number;
  notes?: string;
  addedAt: string;
  photos?: MarkerPhoto[];
};

type PropertyMap = {
  id: string;
  name: string;
  imageUrl: string;
  markers: MapMarker[];
};

type MarkerCfg = { value: string; label: string; color: string; symbol: string };

const MARKER_CONFIGS: Record<string, MarkerCfg[]> = {
  GOOSE_CONTROL: [
    { value: "NEST", label: "Active Nest", color: "#ef4444", symbol: "N" },
    { value: "EGGS", label: "Egg Location", color: "#f97316", symbol: "E" },
    { value: "ACTIVITY", label: "Goose Activity", color: "#eab308", symbol: "A" },
    { value: "TREATED", label: "Treated/Addled", color: "#22c55e", symbol: "T" },
    { value: "CLEARED", label: "Cleared Area", color: "#6b7280", symbol: "C" },
  ],
  RODENT_INSPECTION: [
    { value: "BURROW", label: "Burrow/Entry", color: "#92400e", symbol: "B" },
    { value: "GNAW_MARKS", label: "Gnaw Marks", color: "#f97316", symbol: "G" },
    { value: "DROPPINGS", label: "Droppings", color: "#78350f", symbol: "D" },
    { value: "BAIT_STATION", label: "Bait Station", color: "#eab308", symbol: "!" },
    { value: "ENTRY_POINT", label: "Entry Point", color: "#ef4444", symbol: "X" },
  ],
  RODENT_EXCLUSION: [
    { value: "ENTRY_POINT", label: "Entry Point", color: "#ef4444", symbol: "X" },
    { value: "SEALED", label: "Sealed/Repaired", color: "#22c55e", symbol: "S" },
    { value: "BAIT_STATION", label: "Bait Station", color: "#eab308", symbol: "!" },
    { value: "DAMAGE", label: "Structural Damage", color: "#f97316", symbol: "D" },
    { value: "BURROW", label: "Burrow", color: "#92400e", symbol: "B" },
  ],
  WILDLIFE_INSPECTION: [
    { value: "SIGHTING", label: "Animal Sighting", color: "#3b82f6", symbol: "S" },
    { value: "DAMAGE", label: "Structural Damage", color: "#ef4444", symbol: "D" },
    { value: "ENTRY_POINT", label: "Entry Point", color: "#f97316", symbol: "X" },
    { value: "TRAP", label: "Trap Location", color: "#22c55e", symbol: "T" },
  ],
  WILDLIFE_REMOVAL: [
    { value: "SIGHTING", label: "Animal Sighting", color: "#3b82f6", symbol: "S" },
    { value: "TRAP", label: "Trap Location", color: "#22c55e", symbol: "T" },
    { value: "ENTRY_POINT", label: "Entry Point", color: "#f97316", symbol: "X" },
    { value: "DAMAGE", label: "Structural Damage", color: "#ef4444", symbol: "D" },
    { value: "REMOVED", label: "Animal Removed", color: "#6b7280", symbol: "R" },
  ],
  BIRD_EXCLUSION: [
    { value: "NESTING_SITE", label: "Nesting Site", color: "#ef4444", symbol: "N" },
    { value: "ROOSTING_AREA", label: "Roosting Area", color: "#f97316", symbol: "R" },
    { value: "EXCLUSION_ZONE", label: "Exclusion Zone", color: "#3b82f6", symbol: "E" },
    { value: "DAMAGE", label: "Bird Damage", color: "#eab308", symbol: "D" },
  ],
};

const FALLBACK_MARKERS: MarkerCfg[] = [
  { value: "MARKER", label: "General Marker", color: "#0ABAB5", symbol: "M" },
  { value: "HAZARD", label: "Hazard", color: "#ef4444", symbol: "!" },
  { value: "NOTE", label: "Note", color: "#3b82f6", symbol: "i" },
];

function getConfigs(serviceType?: string): MarkerCfg[] {
  return MARKER_CONFIGS[serviceType ?? ""] ?? FALLBACK_MARKERS;
}

function getMarkerCfg(type: string, serviceType?: string): MarkerCfg {
  const all = [...(MARKER_CONFIGS[serviceType ?? ""] ?? []), ...FALLBACK_MARKERS];
  return all.find((c) => c.value === type) ?? { value: type, label: type, color: "#0ABAB5", symbol: "?" };
}

const SERVICE_HINTS: Record<string, string> = {
  GOOSE_CONTROL: "Mark nesting sites, egg locations, goose activity areas, and treated zones on your aerial photo.",
  RODENT_INSPECTION: "Mark burrows, entry points, gnaw damage, droppings, and bait station locations.",
  RODENT_EXCLUSION: "Mark entry points, areas sealed, bait stations placed, and structural damage.",
  WILDLIFE_INSPECTION: "Mark animal sightings, entry points, structural damage, and trap locations.",
  WILDLIFE_REMOVAL: "Mark animal sightings, trap locations, entry points, and removed animal areas.",
  BIRD_EXCLUSION: "Mark active nesting sites, roosting areas, exclusion zones installed, and damage areas.",
};

type Props = {
  propertyId: string;
  serviceType?: string;
  initialMaps: PropertyMap[];
  dark?: boolean;
};

export function PropertyMapEditor({ propertyId, serviceType, initialMaps, dark = false }: Props) {
  const [maps, setMaps] = useState<PropertyMap[]>(initialMaps);
  const [activeMapId, setActiveMapId] = useState<string | null>(initialMaps[0]?.id ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeType, setActiveType] = useState(() => getConfigs(serviceType)[0]?.value ?? "MARKER");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPhotos, setEditPhotos] = useState<MarkerPhoto[]>([]);
  const [uploadingMarkerPhoto, setUploadingMarkerPhoto] = useState(false);
  const [renamingMapId, setRenamingMapId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markerPhotoInputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("siteMapPhoto");
  const { startUpload: uploadMarkerPhoto } = useUploadThing("inspectionPhoto");

  // Dark-mode style helpers
  const d = dark ? {
    card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px" } as React.CSSProperties,
    border: { borderBottom: "1px solid rgba(255,255,255,0.08)" } as React.CSSProperties,
    titleText: { color: "#ffffff" } as React.CSSProperties,
    muteText: { color: "#64748b" } as React.CSSProperties,
    inputStyle: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" } as React.CSSProperties,
    inputCls: "w-full px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30",
    panelCls: "rounded-xl p-4",
    panelStyle: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" } as React.CSSProperties,
    btnBorder: "border border-[rgba(255,255,255,0.12)] text-slate-300 hover:text-white",
    btnPrimary: "text-white font-semibold",
    btnPrimaryStyle: { background: "#0ABAB5" } as React.CSSProperties,
  } : {
    card: undefined as React.CSSProperties | undefined,
    border: undefined as React.CSSProperties | undefined,
    titleText: undefined as React.CSSProperties | undefined,
    muteText: undefined as React.CSSProperties | undefined,
    inputStyle: undefined as React.CSSProperties | undefined,
    inputCls: "w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30",
    panelCls: "bg-muted/40 rounded-xl p-4 border border-border",
    panelStyle: undefined as React.CSSProperties | undefined,
    btnBorder: "border border-border text-muted-foreground hover:text-foreground hover:bg-muted",
    btnPrimary: "text-white font-semibold bg-primary hover:bg-primary/90",
    btnPrimaryStyle: undefined as React.CSSProperties | undefined,
  };

  const activeMap = maps.find((m) => m.id === activeMapId) ?? null;
  const configs = getConfigs(serviceType);
  const selectedMarker = activeMap?.markers.find((m) => m.id === selectedId) ?? null;

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !activeMapId) return;
      if ((e.target as HTMLElement).closest("[data-marker]")) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
      const marker: MapMarker = {
        id: `mk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: activeType,
        x: Math.min(99, Math.max(1, x)),
        y: Math.min(99, Math.max(1, y)),
        addedAt: new Date().toISOString(),
      };
      setMaps((prev) =>
        prev.map((m) => (m.id === activeMapId ? { ...m, markers: [...m.markers, marker] } : m))
      );
      setIsDirty(true);
      setSelectedId(null);
    },
    [activeMapId, activeType]
  );

  const openMarker = (marker: MapMarker) => {
    setSelectedId(marker.id);
    setEditLabel(marker.label ?? "");
    setEditCount(marker.count !== undefined ? String(marker.count) : "");
    setEditNotes(marker.notes ?? "");
    setEditPhotos(marker.photos ?? []);
  };

  const saveMarkerEdit = () => {
    if (!selectedId || !activeMapId) return;
    setMaps((prev) =>
      prev.map((m) =>
        m.id === activeMapId
          ? {
              ...m,
              markers: m.markers.map((mk) =>
                mk.id === selectedId
                  ? {
                      ...mk,
                      label: editLabel || undefined,
                      count: editCount ? parseInt(editCount) : undefined,
                      notes: editNotes || undefined,
                      photos: editPhotos.length > 0 ? editPhotos : undefined,
                    }
                  : mk
              ),
            }
          : m
      )
    );
    setSelectedId(null);
    setIsDirty(true);
  };

  const handleMarkerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingMarkerPhoto(true);
    try {
      const uploaded = await uploadMarkerPhoto(files);
      if (!uploaded?.length) throw new Error("Upload failed");
      const newPhotos: MarkerPhoto[] = uploaded.map((f) => ({ url: (f as { ufsUrl: string }).ufsUrl, key: f.key }));
      setEditPhotos((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploadingMarkerPhoto(false);
      if (markerPhotoInputRef.current) markerPhotoInputRef.current.value = "";
    }
  };

  const deleteMarker = (markerId: string) => {
    if (!activeMapId) return;
    setMaps((prev) =>
      prev.map((m) =>
        m.id === activeMapId ? { ...m, markers: m.markers.filter((mk) => mk.id !== markerId) } : m
      )
    );
    setSelectedId(null);
    setIsDirty(true);
  };

  const saveMap = async () => {
    if (!activeMapId || !activeMap) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/property-maps/${activeMapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markers: activeMap.markers }),
      });
      if (!res.ok) throw new Error();
      setIsDirty(false);
      toast.success("Map saved");
    } catch {
      toast.error("Failed to save map");
    } finally {
      setSaving(false);
    }
  };

  const renameMap = async (mapId: string, name: string) => {
    try {
      const res = await fetch(`/api/property-maps/${mapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      setMaps((prev) => prev.map((m) => (m.id === mapId ? { ...m, name } : m)));
      setRenamingMapId(null);
    } catch {
      toast.error("Failed to rename map");
    }
  };

  const deleteMap = async (mapId: string) => {
    if (!confirm("Delete this site map and all its markers? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/property-maps/${mapId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const remaining = maps.filter((m) => m.id !== mapId);
      setMaps(remaining);
      setActiveMapId(remaining[0]?.id ?? null);
      if (activeMapId === mapId) setIsDirty(false);
      toast.success("Map deleted");
    } catch {
      toast.error("Failed to delete map");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]) throw new Error("Upload failed");
      const { ufsUrl } = uploaded[0] as { ufsUrl: string };
      const res = await fetch("/api/property-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, name: `Site Map ${maps.length + 1}`, imageUrl: ufsUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newMap: PropertyMap = { ...data.data, markers: [] };
      setMaps((prev) => [newMap, ...prev]);
      setActiveMapId(newMap.id);
      setIsDirty(false);
      toast.success("Aerial photo uploaded — click to place markers");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const markerSummary = configs
    .map((cfg) => ({ ...cfg, n: activeMap?.markers.filter((m) => m.type === cfg.value).length ?? 0 }))
    .filter((c) => c.n > 0);

  return (
    <div className={dark ? "rounded-2xl overflow-hidden" : "bg-card border border-border rounded-xl overflow-hidden"} style={dark ? d.card : undefined}>
      {/* Header */}
      <div className={dark ? "px-5 py-4 flex items-center justify-between gap-3" : "px-5 py-4 border-b border-border flex items-center justify-between gap-3"} style={dark ? d.border : undefined}>
        <div className="flex items-center gap-2">
          <span className="text-base">🗺️</span>
          <h3 className={`text-sm font-semibold uppercase tracking-wide ${dark ? "" : "text-foreground"}`} style={dark ? d.titleText : undefined}>Site Maps</h3>
          {maps.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full" style={dark ? d.muteText : { color: undefined }}>
              {maps.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeMap && (
            <Link
              href={`/reports/site-map/${activeMap.id}`}
              target="_blank"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${d.btnBorder}`}
            >
              View Report
            </Link>
          )}
          {isDirty && (
            <button
              onClick={saveMap}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-60 ${d.btnPrimary}`}
              style={d.btnPrimaryStyle}
            >
              {saving ? "Saving…" : "Save Map"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${d.btnBorder}`}
          >
            {uploading ? "Uploading…" : "+ Upload Photo"}
          </button>
        </div>
      </div>

      {maps.length === 0 ? (
        <div className="p-10 text-center">
          <div className="text-5xl mb-3">🛩️</div>
          <h4 className={`font-semibold mb-1 ${dark ? "text-white" : "text-foreground"}`}>No Site Maps Yet</h4>
          <p className={`text-sm mb-4 max-w-sm mx-auto ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
            {SERVICE_HINTS[serviceType ?? ""] ??
              "Upload an aerial or satellite photo, then tap to place markers at key locations."}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${d.btnPrimary}`}
            style={d.btnPrimaryStyle}
          >
            {uploading ? "Uploading…" : "Upload Aerial Photo"}
          </button>
        </div>
      ) : (
        <>
          {/* Map tabs */}
          <div className={`flex items-center gap-0.5 px-4 pt-3 overflow-x-auto ${dark ? "" : "border-b border-border"}`} style={dark ? d.border : undefined}>
            {maps.map((m) => (
              <div key={m.id} className="flex items-center shrink-0">
                {renamingMapId === m.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); renameMap(m.id, renameValue); }}
                    className="flex items-center gap-1 px-2"
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className={`w-28 text-xs px-2 py-1 rounded-md ${dark ? "text-white" : "border border-primary bg-background"}`}
                      style={dark ? d.inputStyle : undefined}
                      onBlur={() => setRenamingMapId(null)}
                    />
                    <button type="submit" className="text-xs font-semibold" style={dark ? { color: "#0ABAB5" } : { color: "var(--primary)" }}>✓</button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setActiveMapId(m.id); setSelectedId(null); setIsDirty(false); }}
                    onDoubleClick={() => { setRenamingMapId(m.id); setRenameValue(m.name); }}
                    className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                      activeMapId === m.id
                        ? dark ? "border-[#0ABAB5] text-[#0ABAB5] bg-[rgba(10,186,181,0.08)]" : "text-primary border-primary bg-primary/5"
                        : dark ? "border-transparent text-slate-400 hover:text-white" : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                    title="Double-click to rename"
                  >
                    {m.name}
                  </button>
                )}
              </div>
            ))}
          </div>

          {activeMap && (
            <div className="p-4 space-y-4">
              {/* Marker type selector */}
              <div>
                <p className={`text-xs mb-2 ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                  Select a marker type, then tap the photo to place it.
                </p>
                <div className="flex flex-wrap gap-2">
                  {configs.map((cfg) => {
                    const isActive = activeType === cfg.value;
                    return (
                      <button
                        key={cfg.value}
                        onClick={() => { setActiveType(cfg.value); setSelectedId(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                          isActive ? "text-white" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                        style={
                          isActive
                            ? { background: cfg.color, borderColor: cfg.color }
                            : {}
                        }
                      >
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: cfg.color, color: "white" }}
                        >
                          {cfg.symbol}
                        </span>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map image */}
              <div
                ref={containerRef}
                className="relative w-full rounded-xl overflow-hidden cursor-crosshair select-none border border-border"
                onClick={handleMapClick}
                style={{ minHeight: "200px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeMap.imageUrl}
                  alt={activeMap.name}
                  className="w-full h-auto block"
                  style={{ maxHeight: "520px", objectFit: "contain" }}
                  draggable={false}
                />

                {/* Marker overlays */}
                {activeMap.markers.map((marker) => {
                  const cfg = getMarkerCfg(marker.type, serviceType);
                  const isSelected = selectedId === marker.id;
                  return (
                    <button
                      key={marker.id}
                      data-marker
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) setSelectedId(null);
                        else openMarker(marker);
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none group"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%`, zIndex: isSelected ? 20 : 10 }}
                      aria-label={cfg.label}
                    >
                      <div
                        className={`flex items-center justify-center rounded-full text-white font-bold shadow-lg transition-transform group-hover:scale-110 ${
                          isSelected ? "scale-125 ring-2 ring-white ring-offset-1" : ""
                        }`}
                        style={{
                          background: cfg.color,
                          width: isSelected ? "32px" : "28px",
                          height: isSelected ? "32px" : "28px",
                          fontSize: marker.count ? "10px" : "11px",
                        }}
                      >
                        {marker.count ?? cfg.symbol}
                      </div>
                      {marker.label && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-8 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-30">
                          {marker.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Marker editor panel */}
              {selectedMarker && (
                <div className={d.panelCls} style={d.panelStyle}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ background: getMarkerCfg(selectedMarker.type, serviceType).color }}
                      >
                        {getMarkerCfg(selectedMarker.type, serviceType).symbol}
                      </div>
                      <span className={`text-sm font-semibold ${dark ? "text-white" : "text-foreground"}`}>
                        Edit — {getMarkerCfg(selectedMarker.type, serviceType).label}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteMarker(selectedMarker.id)}
                      className="text-xs font-semibold text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Label / ID</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder={
                          selectedMarker.type === "NEST" ? "e.g. Nest #1" :
                          selectedMarker.type === "BURROW" ? "e.g. Burrow A" :
                          "Optional label"
                        }
                        className={d.inputCls}
                        style={d.inputStyle}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                        {selectedMarker.type === "NEST" || selectedMarker.type === "EGGS" ? "Egg Count" :
                         selectedMarker.type === "BURROW" ? "Burrow Count" :
                         selectedMarker.type === "ACTIVITY" ? "Bird Count" :
                         "Count"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editCount}
                        onChange={(e) => setEditCount(e.target.value)}
                        placeholder="—"
                        className={d.inputCls}
                        style={d.inputStyle}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Notes</label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Optional notes about this location…"
                        className={d.inputCls}
                        style={d.inputStyle}
                      />
                    </div>

                    {/* Photos */}
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-semibold mb-2 ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                        Photos {editPhotos.length > 0 && `(${editPhotos.length})`}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {editPhotos.map((p, i) => (
                          <div key={p.url} className="relative w-16 h-16 rounded-lg overflow-hidden border group" style={dark ? { borderColor: "rgba(255,255,255,0.12)" } : { borderColor: "var(--border)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hidden group-hover:flex items-center justify-center text-white text-[9px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => markerPhotoInputRef.current?.click()}
                          disabled={uploadingMarkerPhoto}
                          className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors disabled:opacity-50"
                          style={dark ? { borderColor: "rgba(255,255,255,0.2)", color: "#64748b" } : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                        >
                          {uploadingMarkerPhoto ? <span className="text-[10px]">…</span> : <span className="text-xl leading-none">+</span>}
                        </button>
                        <input
                          ref={markerPhotoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          capture="environment"
                          className="hidden"
                          onChange={handleMarkerPhotoUpload}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setSelectedId(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${d.btnBorder}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveMarkerEdit}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${d.btnPrimary}`}
                      style={d.btnPrimaryStyle}
                    >
                      Save Details
                    </button>
                  </div>
                </div>
              )}

              {/* Summary legend */}
              {markerSummary.length > 0 && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Marker Summary</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {markerSummary.map((cfg) => (
                      <div key={cfg.value} className="flex items-center gap-2 rounded-lg px-3 py-2" style={dark ? { background: "rgba(255,255,255,0.05)" } : { background: "rgba(0,0,0,0.04)" }}>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: cfg.color }}
                        >
                          {cfg.symbol}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold ${dark ? "text-white" : "text-foreground"}`}>{cfg.n}</div>
                          <div className={`text-[10px] truncate ${dark ? "text-slate-400" : "text-muted-foreground"}`}>{cfg.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className={`flex items-center justify-between pt-2 border-t text-xs ${dark ? "text-slate-400 border-[rgba(255,255,255,0.08)]" : "text-muted-foreground border-border"}`}>
                <button
                  onClick={() => deleteMap(activeMap.id)}
                  className="hover:text-red-400 transition-colors"
                >
                  Delete this map
                </button>
                <span>
                  {activeMap.markers.length} marker{activeMap.markers.length !== 1 ? "s" : ""}
                  {isDirty && " · Unsaved changes"}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
