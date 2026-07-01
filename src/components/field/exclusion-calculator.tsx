"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import { toast } from "sonner";

// ─── Pricing tables ───────────────────────────────────────────────────────────

const DOOR_SWEEP_TYPES: Record<string, { label: string; price: number }> = {
  none:       { label: "No door sweep",        price: 0   },
  low36:      { label: 'Low-profile 36"',       price: 120 },
  low48:      { label: 'Low-profile 48"',       price: 150 },
  standard36: { label: 'Standard 36"',          price: 180 },
  standard48: { label: 'Standard 48"',          price: 210 },
  versa36:    { label: 'Versa-Line 36"',        price: 255 },
  versa48:    { label: 'Versa-Line 48"',        price: 300 },
};

const CRAWL_DOOR_TYPES: Record<string, { label: string; price: number }> = {
  none:      { label: "No crawl door",                 price: 0   },
  standard:  { label: "Standard aluminum crawl door",  price: 400 },
  oversized: { label: "Oversized aluminum crawl door", price: 525 },
};

// Per-unit / per-foot rates
const RATES = {
  rodentShield:      8,    // $/linear ft
  rodeXit:          12,    // $/linear ft
  ridgeGuard:       10,    // $/linear ft
  foundationVent:   75,    // $/unit
  roofVent:         85,    // $/unit
  bathroomVentBird: 65,    // $/unit
  garageTrimShield: 45,    // $/unit
  garageGuardKit:   120,   // $/kit
  cementCrawlWell:  150,   // $/well
  remoteSurcharge:  150,   // flat fee
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

export function ExclusionCalculator({ appointmentId }: { appointmentId: string }) {
  const storageKey = `fd-excl-${appointmentId}`;

  const [s, setS] = useState<CalculatorState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...EMPTY, ...(JSON.parse(saved) as Partial<CalculatorState>) } : EMPTY;
    } catch { return EMPTY; }
  });
  const [copied, setCopied] = useState(false);

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

  const rodentShieldWork  = n(s.rodentShieldFt) * RATES.rodentShield;
  const rodeXitWork       = n(s.rodeXitFt) * RATES.rodeXit;
  const ridgeGuardWork    = n(s.ridgeGuardFt) * RATES.ridgeGuard;
  const ventBirdWork      =
    n(s.foundationVents) * RATES.foundationVent +
    n(s.roofVents) * RATES.roofVent +
    n(s.bathroomVentBirds) * RATES.bathroomVentBird;
  const garageWork        =
    n(s.garageTrimShields) * RATES.garageTrimShield +
    n(s.garageGuardKits) * RATES.garageGuardKit;
  const doorSweepWork     =
    (DOOR_SWEEP_TYPES[s.doorSweepType]?.price ?? 0) * n(s.doorSweepQty);
  const crawlWork         =
    (CRAWL_DOOR_TYPES[s.crawlDoor]?.price ?? 0) +
    n(s.cementCrawlWells) * RATES.cementCrawlWell;
  const remoteSurcharge   = s.remoteArea ? RATES.remoteSurcharge : 0;

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

      {/* ── Copy quote button ── */}
      <button
        onClick={copyQuote}
        disabled={total === 0}
        className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30"
        style={copied
          ? { background: "#22c55e", color: "#fff" }
          : { background: TEAL, color: "#fff" }
        }
      >
        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
        {copied ? "Copied!" : "Copy Quote to Clipboard"}
      </button>

      {/* Reset */}
      {total > 0 && (
        <button
          onClick={() => { if (confirm("Reset all fields?")) setS(EMPTY); }}
          className="w-full py-2 text-xs font-semibold rounded-xl transition-colors"
          style={{ color: MUTED, background: "rgba(255,255,255,0.03)" }}
        >
          Reset calculator
        </button>
      )}
    </div>
  );
}
