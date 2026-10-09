"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCopy, Check, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EXCLUSION_CATEGORY, EXCLUSION_PRODUCTS, type CatalogUnit } from "@/lib/product-catalog";

// ─── Pricing tables ───────────────────────────────────────────────────────────
// Prices come from the org's price list (/api/products?category=Exclusion),
// keyed by sku. EXCLUSION_PRODUCTS holds the original prices and is used when
// the price list can't be loaded (e.g. offline in the field).

const DOOR_SWEEP_TYPES: Record<string, { label: string; sku: string | null }> = {
  none:       { label: "No door sweep",        sku: null },
  low36:      { label: 'Low-profile 36"',       sku: "door-sweep-low36" },
  low48:      { label: 'Low-profile 48"',       sku: "door-sweep-low48" },
  standard36: { label: 'Standard 36"',          sku: "door-sweep-standard36" },
  standard48: { label: 'Standard 48"',          sku: "door-sweep-standard48" },
  versa36:    { label: 'Versa-Line 36"',        sku: "door-sweep-versa36" },
  versa48:    { label: 'Versa-Line 48"',        sku: "door-sweep-versa48" },
};

const CRAWL_DOOR_TYPES: Record<string, { label: string; sku: string | null }> = {
  none:      { label: "No crawl door",                 sku: null },
  standard:  { label: "Standard aluminum crawl door",  sku: "crawl-door-standard" },
  oversized: { label: "Oversized aluminum crawl door", sku: "crawl-door-oversized" },
};

// Per-unit / per-foot rates, by sku
const RATE_SKUS = {
  rodentShield:     "rodent-shield",       // $/linear ft
  rodeXit:          "rodexit",             // $/linear ft
  ridgeGuard:       "ridge-guard",         // $/linear ft
  foundationVent:   "foundation-vent",     // $/unit
  roofVent:         "roof-vent",           // $/unit
  bathroomVentBird: "bathroom-vent-bird",  // $/unit
  garageTrimShield: "garage-trim-shield",  // $/unit
  garageGuardKit:   "garage-guard-kit",    // $/kit
  cementCrawlWell:  "cement-crawl-well",   // $/well
  remoteSurcharge:  "remote-surcharge",    // flat fee
} as const;

type PriceEntry = { price: number; productId: string | null; unit: CatalogUnit };

const FALLBACK_PRICES: Record<string, PriceEntry> = Object.fromEntries(
  EXCLUSION_PRODUCTS.map((p) => [p.sku, { price: p.unitPrice, productId: null, unit: p.unit }])
);

// Line item description → sku, for the fixed-description lines in saveAsEstimate.
const LINE_SKUS: Record<string, string> = {
  "Rodent-shield (linear ft)":               RATE_SKUS.rodentShield,
  "RodeXit (linear ft)":                     RATE_SKUS.rodeXit,
  "Ridge Guard / Peak Protector (linear ft)": RATE_SKUS.ridgeGuard,
  "Foundation vent guard":                   RATE_SKUS.foundationVent,
  "Roof vent guard":                         RATE_SKUS.roofVent,
  "Bathroom vent bird guard":                RATE_SKUS.bathroomVentBird,
  "Garage trim shield":                      RATE_SKUS.garageTrimShield,
  "Garage guard kit":                        RATE_SKUS.garageGuardKit,
  "Cement crawlspace well":                  RATE_SKUS.cementCrawlWell,
  "Remote-area surcharge":                   RATE_SKUS.remoteSurcharge,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalculatorState {
  rodentShieldFt:    string;
  rodeXitFt:         string;
  ridgeGuardFt:      string;
  foundationVents:   string;
  roofVents:         string;
  bathroomVentBirds: string;
  garageTrimShields: string;
  garageGuardKits:   string;
  doorSweepType:     string;
  doorSweepQty:      string;
  crawlDoor:         string;
  cementCrawlWells:  string;
  remoteArea:        boolean;
}

const EMPTY: CalculatorState = {
  rodentShieldFt: "", rodeXitFt: "", ridgeGuardFt: "",
  foundationVents: "", roofVents: "", bathroomVentBirds: "",
  garageTrimShields: "", garageGuardKits: "",
  doorSweepType: "none", doorSweepQty: "",
  crawlDoor: "none", cementCrawlWells: "",
  remoteArea: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v: string) => Math.max(0, parseFloat(v) || 0);
const fmt = (v: number) =>
  v === 0 ? "$0" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Styles (inline dark-navy palette matching field view) ────────────────────

const BG       = "#0A0F1A";
const BG_INPUT = "rgba(255,255,255,0.05)";
const BG_INPUT_BORDER = "1px solid rgba(255,255,255,0.09)";
const TEAL     = "#0ABAB5";
const WHITE    = "#ffffff";
const MUTED    = "#64748b";
const DIVIDER  = "rgba(255,255,255,0.07)";

// ─── Component ────────────────────────────────────────────────────────────────

export function ExclusionCalculator({
  appointmentId,
  customerId,
  propertyId,
  serviceType,
}: {
  appointmentId: string;
  customerId: string;
  propertyId: string;
  serviceType: string;
}) {
  const storageKey = `fd-excl-${appointmentId}`;

  const [s, setS] = useState<CalculatorState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...EMPTY, ...(JSON.parse(saved) as Partial<CalculatorState>) } : EMPTY;
    } catch { return EMPTY; }
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedEstimate, setSavedEstimate] = useState<{ id: string; number: string } | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceEntry>>(FALLBACK_PRICES);

  // Load the org's price list; keep the built-in prices if it can't be reached.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products?category=${encodeURIComponent(EXCLUSION_CATEGORY)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(({ data }: { data: { id: string; sku: string; unitPrice: number; unit: CatalogUnit }[] }) => {
        if (cancelled || !Array.isArray(data)) return;
        const next = { ...FALLBACK_PRICES };
        for (const p of data) next[p.sku] = { price: p.unitPrice, productId: p.id, unit: p.unit };
        setPrices(next);
      })
      .catch(() => { /* offline or no access: built-in prices stay */ });
    return () => { cancelled = true; };
  }, []);

  const price = (sku: string | null | undefined) => (sku ? prices[sku]?.price ?? 0 : 0);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(s));
  }, [s, storageKey]);

  const set = useCallback(
    (field: keyof CalculatorState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
        setS((prev) => ({ ...prev, [field]: val }));
      },
    []
  );

  // ── Calculated subtotals ──────────────────────────────────────────────────

  const rodentShieldWork  = n(s.rodentShieldFt) * price(RATE_SKUS.rodentShield);
  const rodeXitWork       = n(s.rodeXitFt) * price(RATE_SKUS.rodeXit);
  const ridgeGuardWork    = n(s.ridgeGuardFt) * price(RATE_SKUS.ridgeGuard);
  const ventBirdWork      =
    n(s.foundationVents) * price(RATE_SKUS.foundationVent) +
    n(s.roofVents) * price(RATE_SKUS.roofVent) +
    n(s.bathroomVentBirds) * price(RATE_SKUS.bathroomVentBird);
  const garageWork        =
    n(s.garageTrimShields) * price(RATE_SKUS.garageTrimShield) +
    n(s.garageGuardKits) * price(RATE_SKUS.garageGuardKit);
  const doorSweepWork     =
    price(DOOR_SWEEP_TYPES[s.doorSweepType]?.sku) * n(s.doorSweepQty);
  const crawlWork         =
    price(CRAWL_DOOR_TYPES[s.crawlDoor]?.sku) +
    n(s.cementCrawlWells) * price(RATE_SKUS.cementCrawlWell);
  const remoteSurcharge   = s.remoteArea ? price(RATE_SKUS.remoteSurcharge) : 0;

  const total =
    rodentShieldWork + rodeXitWork + ridgeGuardWork +
    ventBirdWork + garageWork + doorSweepWork + crawlWork + remoteSurcharge;

  // ── Copy quote ────────────────────────────────────────────────────────────

  const copyQuote = () => {
    const lines: string[] = [];
    if (rodentShieldWork > 0)  lines.push(`Rodent-shield work          ${fmt(rodentShieldWork)}`);
    if (rodeXitWork > 0)       lines.push(`RodeXit work                ${fmt(rodeXitWork)}`);
    if (ridgeGuardWork > 0)    lines.push(`Ridge Guard / Peak Protector ${fmt(ridgeGuardWork)}`);
    if (ventBirdWork > 0)      lines.push(`Vent and bird guards         ${fmt(ventBirdWork)}`);
    if (garageWork > 0)        lines.push(`Garage protections           ${fmt(garageWork)}`);
    if (doorSweepWork > 0)     lines.push(`Door sweeps                  ${fmt(doorSweepWork)}`);
    if (crawlWork > 0)         lines.push(`Crawl access work            ${fmt(crawlWork)}`);
    if (remoteSurcharge > 0)   lines.push(`Remote surcharge             ${fmt(remoteSurcharge)}`);
    const text = `EXCLUSION ESTIMATE\n\n${lines.join("\n")}\n\nSuggested total: ${fmt(total)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Quote copied");
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => toast.error("Copy failed"));
  };

  // ── Save as estimate ─────────────────────────────────────────────────────

  const saveAsEstimate = async () => {
    const items: {
      description: string; quantity: number; unitPrice: number; sortOrder: number;
      sku?: string; unit?: CatalogUnit; productId?: string | null;
    }[] = [];
    let order = 0;
    if (n(s.rodentShieldFt) > 0)   items.push({ description: "Rodent-shield (linear ft)",              quantity: n(s.rodentShieldFt),   unitPrice: price(RATE_SKUS.rodentShield),      sortOrder: order++ });
    if (n(s.rodeXitFt) > 0)        items.push({ description: "RodeXit (linear ft)",                    quantity: n(s.rodeXitFt),        unitPrice: price(RATE_SKUS.rodeXit),           sortOrder: order++ });
    if (n(s.ridgeGuardFt) > 0)     items.push({ description: "Ridge Guard / Peak Protector (linear ft)",quantity: n(s.ridgeGuardFt),     unitPrice: price(RATE_SKUS.ridgeGuard),        sortOrder: order++ });
    if (n(s.foundationVents) > 0)  items.push({ description: "Foundation vent guard",                  quantity: n(s.foundationVents),  unitPrice: price(RATE_SKUS.foundationVent),    sortOrder: order++ });
    if (n(s.roofVents) > 0)        items.push({ description: "Roof vent guard",                        quantity: n(s.roofVents),        unitPrice: price(RATE_SKUS.roofVent),          sortOrder: order++ });
    if (n(s.bathroomVentBirds) > 0)items.push({ description: "Bathroom vent bird guard",               quantity: n(s.bathroomVentBirds),unitPrice: price(RATE_SKUS.bathroomVentBird),  sortOrder: order++ });
    if (n(s.garageTrimShields) > 0)items.push({ description: "Garage trim shield",                     quantity: n(s.garageTrimShields),unitPrice: price(RATE_SKUS.garageTrimShield),  sortOrder: order++ });
    if (n(s.garageGuardKits) > 0)  items.push({ description: "Garage guard kit",                       quantity: n(s.garageGuardKits),  unitPrice: price(RATE_SKUS.garageGuardKit),    sortOrder: order++ });
    if (s.doorSweepType !== "none" && n(s.doorSweepQty) > 0)
      items.push({ description: `Door sweep – ${DOOR_SWEEP_TYPES[s.doorSweepType].label}`, quantity: n(s.doorSweepQty), unitPrice: price(DOOR_SWEEP_TYPES[s.doorSweepType].sku), sortOrder: order++ });
    if (s.crawlDoor !== "none")
      items.push({ description: CRAWL_DOOR_TYPES[s.crawlDoor].label,                       quantity: 1,                unitPrice: price(CRAWL_DOOR_TYPES[s.crawlDoor].sku),    sortOrder: order++ });
    if (n(s.cementCrawlWells) > 0) items.push({ description: "Cement crawlspace well",                 quantity: n(s.cementCrawlWells), unitPrice: price(RATE_SKUS.cementCrawlWell),   sortOrder: order++ });
    if (s.remoteArea)              items.push({ description: "Remote-area surcharge",                   quantity: 1,                    unitPrice: price(RATE_SKUS.remoteSurcharge),   sortOrder: order++ });

    if (items.length === 0) { toast.error("No items to save"); return; }

    // Attach the price-list sku, unit and product to each line, matched by its price key.
    const skuFor = (description: string) => {
      const door = Object.values(DOOR_SWEEP_TYPES).find((d) => d.sku && description === `Door sweep – ${d.label}`);
      if (door?.sku) return door.sku;
      const crawl = Object.values(CRAWL_DOOR_TYPES).find((d) => d.sku && description === d.label);
      if (crawl?.sku) return crawl.sku;
      return LINE_SKUS[description];
    };
    for (const item of items) {
      const sku = skuFor(item.description);
      if (!sku) continue;
      item.sku = sku;
      item.unit = prices[sku]?.unit;
      item.productId = prices[sku]?.productId ?? null;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId: propertyId || null,
          title: "Exclusion Work Estimate",
          serviceType: serviceType === "RODENT_EXCLUSION" ? serviceType : "RODENT_EXCLUSION",
          source: "exclusion-calculator",
          lineItems: items,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { data } = await res.json();
      setSavedEstimate({ id: data.id, number: data.estimateNumber });
      toast.success(`Estimate ${data.estimateNumber} created`);
    } catch {
      toast.error("Failed to save estimate");
    } finally {
      setSaving(false);
    }
  };

  // ── Reusable field component ──────────────────────────────────────────────

  const Field = ({
    label, field, placeholder = "0",
  }: { label: string; field: keyof CalculatorState; placeholder?: string }) => (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: WHITE }}>{label}</label>
      <input
        type="number"
        min="0"
        value={s[field] as string}
        onChange={set(field)}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        style={{ background: BG_INPUT, border: BG_INPUT_BORDER }}
      />
    </div>
  );

  const lineItems = [
    { label: "Rodent-shield work",          value: rodentShieldWork },
    { label: "RodeXit work",                value: rodeXitWork },
    { label: "Ridge Guard / Peak Protector",value: ridgeGuardWork },
    { label: "Vent and bird guards",         value: ventBirdWork },
    { label: "Garage protections",           value: garageWork },
    { label: "Door sweeps",                  value: doorSweepWork },
    { label: "Crawl access work",            value: crawlWork },
    { label: "Remote surcharge",             value: remoteSurcharge },
  ];

  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: TEAL }}>
          Exclusion Calculator
        </p>
        <h2 className="text-xl font-bold leading-tight" style={{ color: WHITE }}>
          Linear Footage and Product Totals
        </h2>
        <div
          className="mt-3 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-black"
          style={{ background: "rgba(255,255,255,0.08)", color: total > 0 ? TEAL : WHITE }}
        >
          {fmt(total)}
        </div>
      </div>

      {/* ── Inputs ── */}
      <div className="space-y-4">
        <Field label="Rodent-shield linear feet"     field="rodentShieldFt" />
        <Field label="RodeXit linear feet"           field="rodeXitFt" />
        <Field label="Ridge Guard / Peak Protector feet" field="ridgeGuardFt" />
        <Field label="Foundation vent guards"        field="foundationVents" />
        <Field label="Roof vent guards"              field="roofVents" />
        <Field label="Bathroom vent bird guards"     field="bathroomVentBirds" />
        <Field label="Garage trim shields"           field="garageTrimShields" />
        <Field label="Garage guard kits"             field="garageGuardKits" />

        {/* Door sweep type */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: WHITE }}>Door sweep type</label>
          <div className="relative">
            <select
              value={s.doorSweepType}
              onChange={set("doorSweepType")}
              className="w-full appearance-none px-4 py-3.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 pr-8"
              style={{ background: BG_INPUT, border: BG_INPUT_BORDER }}
            >
              {Object.entries(DOOR_SWEEP_TYPES).map(([k, v]) => (
                <option key={k} value={k} style={{ background: "#1a2744" }}>{v.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: MUTED }}>▾</span>
          </div>
        </div>

        <Field label="Door sweep quantity" field="doorSweepQty" />

        {/* Crawl door */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: WHITE }}>Crawl door</label>
          <div className="relative">
            <select
              value={s.crawlDoor}
              onChange={set("crawlDoor")}
              className="w-full appearance-none px-4 py-3.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 pr-8"
              style={{ background: BG_INPUT, border: BG_INPUT_BORDER }}
            >
              {Object.entries(CRAWL_DOOR_TYPES).map(([k, v]) => (
                <option key={k} value={k} style={{ background: "#1a2744" }}>{v.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: MUTED }}>▾</span>
          </div>
        </div>

        <Field label="Cement crawlspace wells" field="cementCrawlWells" />

        {/* Remote area checkbox */}
        <label className="flex items-center gap-3 cursor-pointer py-1">
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={s.remoteArea}
              onChange={set("remoteArea")}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-colors"
              style={{
                background: s.remoteArea ? TEAL : "transparent",
                border: s.remoteArea ? `2px solid ${TEAL}` : "2px solid rgba(255,255,255,0.3)",
              }}
            >
              {s.remoteArea && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </div>
          </div>
          <span className="text-sm" style={{ color: WHITE }}>Apply remote-area estimate</span>
        </label>
      </div>

      {/* ── Line-item breakdown ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}` }}>
        <div className="divide-y" style={{ borderColor: DIVIDER }}>
          {lineItems.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm" style={{ color: value > 0 ? WHITE : MUTED }}>{label}</span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: value > 0 ? WHITE : MUTED }}
              >
                {fmt(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ background: total > 0 ? "rgba(10,186,181,0.15)" : "rgba(255,255,255,0.05)", borderTop: `1px solid ${DIVIDER}` }}
        >
          <span className="text-sm font-bold" style={{ color: total > 0 ? TEAL : WHITE }}>
            Suggested exclusion total
          </span>
          <span className="text-lg font-black tabular-nums" style={{ color: total > 0 ? TEAL : WHITE }}>
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* ── Saved estimate banner ── */}
      {savedEstimate && (
        <a
          href={`/estimates/${savedEstimate.id}`}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
        >
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {savedEstimate.number} saved
          </span>
          <span className="flex items-center gap-1 text-xs opacity-80">
            View Estimate <ExternalLink className="h-3 w-3" />
          </span>
        </a>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-2">
        <button
          onClick={copyQuote}
          disabled={total === 0}
          className="flex-1 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30"
          style={copied
            ? { background: "#22c55e", color: "#fff" }
            : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: WHITE }
          }
        >
          {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Quote"}
        </button>

        <button
          onClick={saveAsEstimate}
          disabled={total === 0 || saving}
          className="flex-1 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30"
          style={{ background: TEAL, color: "#fff" }}
        >
          <FileText className="h-4 w-4" />
          {saving ? "Saving…" : "Save Estimate"}
        </button>
      </div>

      {/* Reset */}
      {total > 0 && (
        <button
          onClick={() => { if (confirm("Reset all fields?")) { setS(EMPTY); setSavedEstimate(null); } }}
          className="w-full py-2 text-xs font-semibold rounded-xl transition-colors"
          style={{ color: MUTED, background: "rgba(255,255,255,0.03)" }}
        >
          Reset calculator
        </button>
      )}
    </div>
  );
}
