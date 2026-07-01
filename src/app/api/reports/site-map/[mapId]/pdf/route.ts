import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import sharp from "sharp";

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

function getCfg(type: string) {
  return ALL_MARKER_CONFIGS[type] ?? { label: type, color: "#0ABAB5", symbol: "?" };
}

// ── Page layout constants (pts) ─────────────────────────────────────────────
const PG_W = 612;   // LETTER width
const PG_H = 792;   // LETTER height
const MARGIN = 32;
const CONTENT_W = PG_W - MARGIN * 2;
const MAX_MAP_H = 380; // cap map height so details fit on one page

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    backgroundColor: "#ffffff",
    padding: MARGIN,
  },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  orgSub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  reportLabel: { fontSize: 7, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  reportTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", marginTop: 2 },
  reportDate: { fontSize: 8, color: "#64748b", marginTop: 2 },
  // Map container (position: relative so markers can be absolute inside)
  mapWrapper: { position: "relative", alignSelf: "center", marginBottom: 8 },
  mapImage: { display: "flex" },
  // Marker pin
  markerPin: { position: "absolute", alignItems: "center" },
  markerCircle: { borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#ffffff" },
  markerTail: { width: 2, height: 4, marginTop: -1 },
  markerNum: { color: "#ffffff", fontSize: 6, fontFamily: "Helvetica-Bold" },
  // Legend
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  legendPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20, borderWidth: 0.5, borderColor: "#e2e8f0" },
  legendDot: { width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  legendDotText: { color: "#ffffff", fontSize: 6, fontFamily: "Helvetica-Bold" },
  legendText: { fontSize: 7.5, color: "#374151" },
  legendCount: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#111827" },
  // Detail rows
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  detailCard: { flexDirection: "row", gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "#f8fafc", marginBottom: 4 },
  detailBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailBadgeNum: { color: "#ffffff", fontSize: 7, fontFamily: "Helvetica-Bold" },
  detailBody: { flex: 1 },
  detailTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  detailMeta: { fontSize: 7.5, color: "#64748b", marginTop: 1 },
  detailNotes: { fontSize: 7.5, color: "#374151", marginTop: 2 },
  detailDate: { fontSize: 7, color: "#94a3b8", marginTop: 2 },
  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  photo: { width: 60, height: 60, objectFit: "cover", borderRadius: 4 },
  // Footer
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#e2e8f0" },
  footerText: { fontSize: 7, color: "#94a3b8" },
  // Photo page
  photoPageTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 12 },
  photoSection: { marginBottom: 16 },
  photoSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  photoSectionDot: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  photoSectionLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  photoLargeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoLarge: { width: 130, height: 100, objectFit: "cover", borderRadius: 6 },
});

interface SiteMapPDFProps {
  orgName: string;
  orgLogoUrl: string | null;
  mapName: string;
  propertyName: string;
  customerName: string | null;
  address: string;
  reportDate: string;
  mapImageUrl: string;
  mapPdfWidth: number;
  mapPdfHeight: number;
  markers: MapMarker[];
}

function SiteMapPDF({
  orgName, orgLogoUrl, mapName, propertyName, customerName, address, reportDate,
  mapImageUrl, mapPdfWidth, mapPdfHeight, markers,
}: SiteMapPDFProps) {
  const markersByType = markers.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1;
    return acc;
  }, {});

  const typeSummary = Object.entries(markersByType).map(([type, count]) => ({
    ...getCfg(type), type, count,
  }));

  const photoMarkers = markers.filter((m) => m.photos && m.photos.length > 0);

  return React.createElement(
    Document,
    {},
    // ── Page 1: Summary ──────────────────────────────────────────────────────
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          {},
          orgLogoUrl
            ? React.createElement(Image, { src: orgLogoUrl, style: { height: 28, marginBottom: 4, objectFit: "contain" as "contain" } })
            : null,
          React.createElement(Text, { style: styles.orgName }, orgName),
          React.createElement(Text, { style: styles.orgSub }, [customerName, propertyName, address].filter(Boolean).join(" · ")),
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(Text, { style: styles.reportLabel }, "Site Map Report"),
          React.createElement(Text, { style: styles.reportTitle }, mapName),
          React.createElement(Text, { style: styles.reportDate }, reportDate),
        ),
      ),

      // Legend strip
      typeSummary.length > 0
        ? React.createElement(
            View,
            { style: styles.legendRow },
            ...typeSummary.map((cfg) =>
              React.createElement(
                View,
                { key: cfg.type, style: styles.legendPill },
                React.createElement(
                  View,
                  { style: [styles.legendDot, { backgroundColor: cfg.color }] },
                  React.createElement(Text, { style: styles.legendDotText }, cfg.symbol),
                ),
                React.createElement(Text, { style: styles.legendCount }, String(cfg.count)),
                React.createElement(Text, { style: styles.legendText }, cfg.label),
              )
            ),
          )
        : null,

      // Map image with marker pins
      React.createElement(
        View,
        { style: [styles.mapWrapper, { width: mapPdfWidth, height: mapPdfHeight }] },
        React.createElement(Image, {
          src: mapImageUrl,
          style: [styles.mapImage, { width: mapPdfWidth, height: mapPdfHeight }],
        }),
        ...markers.map((marker, idx) => {
          const cfg = getCfg(marker.type);
          const pinX = (marker.x / 100) * mapPdfWidth - 9;
          const pinY = (marker.y / 100) * mapPdfHeight - 22;
          return React.createElement(
            View,
            { key: marker.id, style: [styles.markerPin, { left: pinX, top: pinY }] },
            React.createElement(
              View,
              { style: [styles.markerCircle, { width: 18, height: 18, backgroundColor: cfg.color }] },
              React.createElement(Text, { style: styles.markerNum }, String(idx + 1)),
            ),
            React.createElement(View, { style: [styles.markerTail, { backgroundColor: cfg.color }] }),
          );
        }),
      ),

      // Location details
      markers.length > 0
        ? React.createElement(
            View,
            {},
            React.createElement(Text, { style: [styles.sectionLabel, { marginBottom: 5 }] }, "Location Details"),
            ...markers.slice(0, 16).map((marker, idx) => {
              const cfg = getCfg(marker.type);
              const metaParts: string[] = [];
              if (marker.label) metaParts.push(marker.label);
              if (marker.count !== undefined) metaParts.push(`×${marker.count}`);
              return React.createElement(
                View,
                { key: marker.id, style: styles.detailCard, wrap: false },
                React.createElement(
                  View,
                  { style: [styles.detailBadge, { backgroundColor: cfg.color }] },
                  React.createElement(Text, { style: styles.detailBadgeNum }, String(idx + 1)),
                ),
                React.createElement(
                  View,
                  { style: styles.detailBody },
                  React.createElement(
                    View,
                    { style: { flexDirection: "row", alignItems: "center", gap: 4 } },
                    React.createElement(Text, { style: styles.detailTitle }, cfg.label),
                    metaParts.length > 0
                      ? React.createElement(Text, { style: { fontSize: 7.5, color: cfg.color } }, metaParts.join("  "))
                      : null,
                  ),
                  marker.notes ? React.createElement(Text, { style: styles.detailNotes }, marker.notes) : null,
                  // Inline photos (first 4)
                  marker.photos && marker.photos.length > 0
                    ? React.createElement(
                        View,
                        { style: styles.photoGrid },
                        ...marker.photos.slice(0, 4).map((p, pi) =>
                          React.createElement(Image, { key: pi, src: p.url, style: styles.photo })
                        ),
                      )
                    : null,
                  React.createElement(
                    Text,
                    { style: styles.detailDate },
                    new Date(marker.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  ),
                ),
              );
            }),
            markers.length > 16
              ? React.createElement(Text, { style: { fontSize: 7.5, color: "#94a3b8", marginTop: 4 } }, `+ ${markers.length - 16} more locations not shown.`)
              : null,
          )
        : null,

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, orgName),
        React.createElement(Text, { style: styles.footerText }, `Prepared by FieldDetect · ${reportDate}`),
      ),
    ),

    // ── Page 2: Photo documentation (only if photos exist) ──────────────────
    photoMarkers.length > 0
      ? React.createElement(
          Page,
          { size: "LETTER", style: styles.page },
          React.createElement(Text, { style: styles.photoPageTitle }, "Photo Documentation"),
          ...photoMarkers.map((marker) => {
            const cfg = getCfg(marker.type);
            return React.createElement(
              View,
              { key: marker.id, style: styles.photoSection, wrap: false },
              React.createElement(
                View,
                { style: styles.photoSectionHeader },
                React.createElement(
                  View,
                  { style: [styles.photoSectionDot, { backgroundColor: cfg.color }] },
                  React.createElement(Text, { style: styles.legendDotText }, cfg.symbol),
                ),
                React.createElement(
                  Text,
                  { style: styles.photoSectionLabel },
                  `${cfg.label}${marker.label ? ` — ${marker.label}` : ""}  (${marker.photos!.length} photo${marker.photos!.length !== 1 ? "s" : ""})`,
                ),
              ),
              React.createElement(
                View,
                { style: styles.photoLargeGrid },
                ...marker.photos!.slice(0, 9).map((p, pi) =>
                  React.createElement(Image, { key: pi, src: p.url, style: styles.photoLarge })
                ),
              ),
            );
          }),
          React.createElement(
            View,
            { style: styles.footer },
            React.createElement(Text, { style: styles.footerText }, orgName),
            React.createElement(Text, { style: styles.footerText }, `Prepared by FieldDetect · ${reportDate}`),
          ),
        )
      : null,
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { mapId } = await params;

    const propertyMap = await prisma.propertyMap.findFirst({
      where: { id: mapId, organizationId: user.organizationId },
    });
    if (!propertyMap) return new NextResponse("Not found", { status: 404 });

    const [property, org] = await Promise.all([
      prisma.property.findUnique({ where: { id: propertyMap.propertyId }, include: { customer: true } }),
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
    ]);

    // Fetch the map image to get its actual pixel dimensions via sharp
    const imageBuffer = await fetch(propertyMap.imageUrl).then((r) => r.arrayBuffer());
    const meta = await sharp(Buffer.from(imageBuffer)).metadata();
    const imgW = meta.width ?? 800;
    const imgH = meta.height ?? 600;

    // Scale to fit within CONTENT_W × MAX_MAP_H, preserving aspect ratio
    let mapPdfWidth = CONTENT_W;
    let mapPdfHeight = (imgH / imgW) * CONTENT_W;
    if (mapPdfHeight > MAX_MAP_H) {
      mapPdfHeight = MAX_MAP_H;
      mapPdfWidth = (imgW / imgH) * MAX_MAP_H;
    }

    const markers = (propertyMap.markers as unknown as MapMarker[]) ?? [];

    const customerName = property?.customer
      ? property.customer.companyName || `${property.customer.firstName} ${property.customer.lastName}`
      : null;
    const address = property
      ? `${(property as { addressLine1: string }).addressLine1}, ${(property as { city: string }).city}, ${(property as { state: string }).state}`
      : "";

    const reportDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const element = React.createElement(SiteMapPDF, {
      orgName: org?.name ?? "FieldDetect",
      orgLogoUrl: org?.logoUrl ?? null,
      mapName: propertyMap.name,
      propertyName: property?.name ?? "",
      customerName,
      address,
      reportDate,
      mapImageUrl: propertyMap.imageUrl,
      mapPdfWidth,
      mapPdfHeight,
      markers,
    });

    const pdfStream = await pdf(element as React.ReactElement<DocumentProps>).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const safeName = propertyMap.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="site-map-${safeName}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[SITE_MAP_PDF]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
