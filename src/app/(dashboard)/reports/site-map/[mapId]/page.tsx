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

  const customerName = property?.customer
    ? property.customer.companyName || `${property.customer.firstName} ${property.customer.lastName}`
    : null;

  const address = property
    ? `${(property as { addressLine1: string }).addressLine1}, ${(property as { city: string }).city}, ${(property as { state: string }).state}`
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen-only nav */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between print:hidden border-b border-border">
        <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">← Reports</Link>
        <PrintButton />
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* Header — compact single block */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {org?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt={org.name} className="h-12 w-auto object-contain shrink-0" />
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Site Map Report</p>
              <h1 className="text-xl font-bold text-foreground leading-tight">{propertyMap.name}</h1>
              {property && (
                <p className="text-sm text-foreground font-medium mt-0.5">{property.name}</p>
              )}
              {(customerName || address) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[customerName, address].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {org && <p className="text-xs text-muted-foreground mt-0.5">{org.name}</p>}
          </div>
        </div>

        {/* Legend strip — inline before the map */}
        {typeSummary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {typeSummary.map((cfg) => (
              <div
                key={cfg.type}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium"
              >
                <span
                  className="inline-flex items-center justify-center rounded-full text-white font-bold"
                  style={{ background: cfg.color, width: "18px", height: "18px", fontSize: "9px", flexShrink: 0 }}
                >
                  {cfg.symbol}
                </span>
                <span className="text-foreground">{cfg.count}×</span>
                <span className="text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Annotated Site Map — no objectFit/maxHeight so markers align exactly */}
        <div className="rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative w-full">
            <img
              src={propertyMap.imageUrl}
              alt={propertyMap.name}
              className="w-full h-auto block"
              draggable={false}
            />
            {markers.map((marker, idx) => {
              const cfg = getMarkerCfg(marker.type);
              return (
                <div
                  key={marker.id}
                  className="absolute flex flex-col items-center pointer-events-none"
                  style={{
                    left: `${marker.x}%`,
                    top: `${marker.y}%`,
                    transform: "translate(-50%, -100%)",
                    zIndex: 10,
                  }}
                >
                  {/* Numbered pin */}
                  <div
                    className="flex items-center justify-center rounded-full text-white font-bold shadow-lg"
                    style={{
                      background: cfg.color,
                      width: "26px",
                      height: "26px",
                      fontSize: "10px",
                      border: "2px solid rgba(255,255,255,0.8)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  {/* Pin tail */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: `6px solid ${cfg.color}`,
                      marginTop: "-1px",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Details — compact rows */}
        {markers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Location Details</h2>
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {markers.map((marker, idx) => {
                const cfg = getMarkerCfg(marker.type);
                const hasPhotos = marker.photos && marker.photos.length > 0;
                return (
                  <div key={marker.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* Pin number */}
                      <div
                        className="shrink-0 flex items-center justify-center rounded-full text-white font-bold text-xs mt-0.5"
                        style={{ background: cfg.color, width: "24px", height: "24px" }}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                          {marker.label && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              {marker.label}
                            </span>
                          )}
                          {marker.count !== undefined && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: `${cfg.color}20`, color: cfg.color }}
                            >
                              ×{marker.count}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(marker.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        {marker.notes && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{marker.notes}</p>
                        )}

                        {/* Inline photo thumbnails */}
                        {hasPhotos && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {marker.photos!.map((photo, pi) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={pi}
                                src={photo.url}
                                alt={`${cfg.label} photo ${pi + 1}`}
                                className="rounded-lg border border-border object-cover"
                                style={{ width: "72px", height: "72px" }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {markers.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            No markers have been placed on this site map yet.
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{org?.name}</span>
          <span>Prepared by FieldDetect · {new Date().toLocaleDateString()}</span>
        </div>

      </div>
    </div>
  );
}
