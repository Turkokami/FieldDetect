import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/reports/print-button";

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

const ALL_MARKER_CONFIGS: Record<string, { label: string; color: string; symbol: string }> = {
  NEST: { label: "Active Nest", color: "#ef4444", symbol: "N" },
  EGGS: { label: "Egg Location", color: "#f97316", symbol: "E" },
  ACTIVITY: { label: "Goose Activity", color: "#eab308", symbol: "A" },
  TREATED: { label: "Treated/Addled", color: "#22c55e", symbol: "T" },
  CLEARED: { label: "Cleared Area", color: "#6b7280", symbol: "C" },
  BURROW: { label: "Burrow/Entry", color: "#92400e", symbol: "B" },
  GNAW_MARKS: { label: "Gnaw Marks", color: "#f97316", symbol: "G" },
  DROPPINGS: { label: "Droppings", color: "#78350f", symbol: "D" },
  BAIT_STATION: { label: "Bait Station", color: "#eab308", symbol: "!" },
  ENTRY_POINT: { label: "Entry Point", color: "#ef4444", symbol: "X" },
  SEALED: { label: "Sealed/Repaired", color: "#22c55e", symbol: "S" },
  DAMAGE: { label: "Structural Damage", color: "#f97316", symbol: "D" },
  SIGHTING: { label: "Animal Sighting", color: "#3b82f6", symbol: "S" },
  TRAP: { label: "Trap Location", color: "#22c55e", symbol: "T" },
  REMOVED: { label: "Animal Removed", color: "#6b7280", symbol: "R" },
  NESTING_SITE: { label: "Nesting Site", color: "#ef4444", symbol: "N" },
  ROOSTING_AREA: { label: "Roosting Area", color: "#f97316", symbol: "R" },
  EXCLUSION_ZONE: { label: "Exclusion Zone", color: "#3b82f6", symbol: "E" },
  MARKER: { label: "General Marker", color: "#0ABAB5", symbol: "M" },
  HAZARD: { label: "Hazard", color: "#ef4444", symbol: "!" },
  NOTE: { label: "Note", color: "#3b82f6", symbol: "i" },
};

function getMarkerCfg(type: string) {
  return ALL_MARKER_CONFIGS[type] ?? { label: type, color: "#0ABAB5", symbol: "?" };
}

export default async function SiteMapReportPage({
  params,
}: {
  params: Promise<{ mapId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { mapId } = await params;

  const propertyMap = await prisma.propertyMap.findFirst({
    where: { id: mapId, organizationId: user.organizationId },
  });
  if (!propertyMap) notFound();

  const property = await prisma.property.findUnique({
    where: { id: propertyMap.propertyId },
    include: { customer: true },
  });

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });

  const markers = (propertyMap.markers as unknown as MapMarker[]) ?? [];

  const markersByType = markers.reduce<Record<string, MapMarker[]>>((acc, m) => {
    (acc[m.type] = acc[m.type] ?? []).push(m);
    return acc;
  }, {});

  const typeSummary = Object.entries(markersByType).map(([type, items]) => ({
    ...getMarkerCfg(type),
    type,
    count: items.length,
  }));

  const photoMarkers = markers.filter((m) => m.photos && m.photos.length > 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen-only nav */}
      <div className="p-6 flex items-center justify-between print:hidden">
        <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">← Reports</Link>
        <PrintButton />
      </div>

      <div className="px-6 pb-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            {org?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt={org.name} className="h-10 mb-3 object-contain" />
            )}
            <h1 className="text-2xl font-bold text-foreground">{propertyMap.name}</h1>
            {property && (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{property.name}</p>
                <p className="text-sm text-muted-foreground">
                  {property.customer
                    ? property.customer.companyName || `${property.customer.firstName} ${property.customer.lastName}`
                    : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(property as { addressLine1: string }).addressLine1}, {(property as { city: string; state: string }).city}, {(property as { state: string }).state}
                </p>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Report Generated</p>
            <p className="text-sm font-medium text-foreground">
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            {org && <p className="text-xs text-muted-foreground mt-1">{org.name}</p>}
          </div>
        </div>

        {/* Map with marker overlays */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Annotated Site Map</h2>
          <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={propertyMap.imageUrl}
              alt={propertyMap.name}
              className="w-full h-auto block"
              style={{ maxHeight: "600px", objectFit: "contain" }}
            />
            {markers.map((marker, idx) => {
              const cfg = getMarkerCfg(marker.type);
              return (
                <div
                  key={marker.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${marker.x}%`, top: `${marker.y}%`, zIndex: 10 }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-white font-bold shadow-lg text-xs"
                    style={{ background: cfg.color, width: "26px", height: "26px", fontSize: "10px" }}
                  >
                    {marker.count ?? cfg.symbol}
                  </div>
                  <div
                    className="mt-0.5 text-white text-[9px] font-bold px-1 py-0.5 rounded whitespace-nowrap"
                    style={{ background: "rgba(0,0,0,0.65)", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend / Summary */}
        {typeSummary.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {typeSummary.map((cfg) => (
                <div key={cfg.type} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: cfg.color }}
                  >
                    {cfg.symbol}
                  </div>
                  <div>
                    <div className="text-lg font-black text-foreground">{cfg.count}</div>
                    <div className="text-xs text-muted-foreground">{cfg.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed marker list */}
        {markers.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">Location Details</h2>
            <div className="space-y-4">
              {markers.map((marker, idx) => {
                const cfg = getMarkerCfg(marker.type);
                return (
                  <div key={marker.id} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-start gap-4 px-5 py-4">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: cfg.color }}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{cfg.symbol}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                          {marker.label && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {marker.label}
                            </span>
                          )}
                          {marker.count !== undefined && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                              Count: {marker.count}
                            </span>
                          )}
                        </div>
                        {marker.notes && (
                          <p className="text-sm text-muted-foreground">{marker.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Added {new Date(marker.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {/* Photos */}
                    {marker.photos && marker.photos.length > 0 && (
                      <div className="px-5 pb-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {marker.photos.map((photo, pi) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={pi}
                              src={photo.url}
                              alt={`${cfg.label} photo ${pi + 1}`}
                              className="w-full aspect-square object-cover rounded-lg border border-border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {markers.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            No markers have been placed on this site map yet.
          </div>
        )}

        {/* Photo appendix */}
        {photoMarkers.length > 0 && (
          <div className="print:break-before-page">
            <h2 className="text-base font-semibold text-foreground mb-4">Photo Documentation</h2>
            <div className="space-y-6">
              {photoMarkers.map((marker, idx) => {
                const cfg = getMarkerCfg(marker.type);
                return (
                  <div key={marker.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: cfg.color }}>
                        {cfg.symbol}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {cfg.label}{marker.label ? ` — ${marker.label}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">({marker.photos!.length} photo{marker.photos!.length !== 1 ? "s" : ""})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {marker.photos!.map((photo, pi) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={pi}
                          src={photo.url}
                          alt={`${cfg.label} photo ${pi + 1}`}
                          className="w-full aspect-video object-cover rounded-xl border border-border"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>{org?.name}</span>
          <span>Prepared by FieldDetect · {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
