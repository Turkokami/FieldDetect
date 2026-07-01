"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, Trash2, ClipboardCopy, Check } from "lucide-react";
import { toast } from "sonner";

// ─── Catalog ──────────────────────────────────────────────────────────────────

type CatalogItem = { id: string; label: string; price: number; category: string };

const CATALOG: CatalogItem[] = [
  // Door Sweeps
  { id: "ds_low36",    label: 'Low-profile 36"',   price: 120,  category: "Door Sweeps" },
  { id: "ds_low48",    label: 'Low-profile 48"',   price: 150,  category: "Door Sweeps" },
  { id: "ds_std36",    label: 'Standard 36"',      price: 180,  category: "Door Sweeps" },
  { id: "ds_std48",    label: 'Standard 48"',      price: 210,  category: "Door Sweeps" },
  { id: "ds_vrs36",    label: 'Versa-Line 36"',    price: 255,  category: "Door Sweeps" },
  { id: "ds_vrs48",    label: 'Versa-Line 48"',    price: 300,  category: "Door Sweeps" },
  // Crawl Space
  { id: "cd_std",      label: "Standard crawl door",   price: 400,  category: "Crawl Space" },
  { id: "cd_over",     label: "Oversized crawl door",  price: 525,  category: "Crawl Space" },
  // Entry Point Sealing
  { id: "ep_vent",     label: "Foundation vent screen",  price:  75,  category: "Entry Sealing" },
  { id: "ep_pipe",     label: "Pipe collar/seal",        price:  45,  category: "Entry Sealing" },
  { id: "ep_foam",     label: "Foam fill (per area)",    price:  35,  category: "Entry Sealing" },
  { id: "ep_swcaulk",  label: "Steel wool + caulk fill", price:  25,  category: "Entry Sealing" },
  { id: "ep_hwcloth",  label: "Hardware cloth patch",    price:  15,  category: "Entry Sealing" },
  { id: "ep_mesh",     label: "Copper mesh fill",        price:  30,  category: "Entry Sealing" },
  // Structural
  { id: "st_corner",   label: "Corner guard install",    price:  85,  category: "Structural" },
  { id: "st_shtsm",    label: "Sheet metal — small",     price: 120,  category: "Structural" },
  { id: "st_shtlg",    label: "Sheet metal — large",     price: 200,  category: "Structural" },
  { id: "st_grout",    label: "Grout/masonry fill",      price:  65,  category: "Structural" },
  // Labor
  { id: "lb_basic",    label: "Exclusion labor (hr)",    price:  95,  category: "Labor" },
  { id: "lb_premium",  label: "Specialist labor (hr)",   price: 125,  category: "Labor" },
];

const CATEGORY_ORDER = ["Door Sweeps", "Crawl Space", "Entry Sealing", "Structural", "Labor"];

// ─── Types ────────────────────────────────────────────────────────────────────

type LineItem = { id: string; label: string; price: number; qty: number; custom: boolean };

// ─── Dark-mode palette ────────────────────────────────────────────────────────

const D = {
  card:    { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px" } as React.CSSProperties,
  divider: { borderColor: "rgba(255,255,255,0.07)" } as React.CSSProperties,
  input:   { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: "8px" } as React.CSSProperties,
  mute:    { color: "#64748b" } as React.CSSProperties,
  white:   { color: "#ffffff" } as React.CSSProperties,
  teal:    { color: "#0ABAB5" } as React.CSSProperties,
  tealBg:  { background: "#0ABAB5" } as React.CSSProperties,
  redBg:   { background: "rgba(239,68,68,0.15)", color: "#f87171" } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ExclusionCalculator({ appointmentId }: { appointmentId: string }) {
  const storageKey = `fd-excl-${appointmentId}`;

  const [lines, setLines] = useState<LineItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as LineItem[]) : [];
    } catch { return []; }
  });

  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ORDER[0]);

  // Persist lines to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines, storageKey]);

  const addFromCatalog = (item: CatalogItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) return prev.map((l) => l.id === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { id: item.id, label: item.label, price: item.price, qty: 1, custom: false }];
    });
  };

  const addCustom = () => {
    const p = parseFloat(customPrice);
    if (!customLabel.trim() || isNaN(p) || p < 0) return;
    setLines((prev) => [...prev, {
      id: `custom_${Date.now()}`,
      label: customLabel.trim(),
      price: p,
      qty: 1,
      custom: true,
    }]);
    setCustomLabel("");
    setCustomPrice("");
  };

  const setQty = (id: string, delta: number) =>
    setLines((prev) =>
      prev.map((l) => l.id === id ? { ...l, qty: Math.max(0, l.qty + delta) } : l)
        .filter((l) => l.qty > 0)
    );

  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const copyQuote = () => {
    if (!lines.length) return;
    const rows = lines.map((l) => `• ${l.label} ×${l.qty}  ${fmt(l.price * l.qty)}`).join("\n");
    const text = `EXCLUSION ESTIMATE\n\n${rows}\n\nTotal: ${fmt(subtotal)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Quote copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => toast.error("Copy failed"));
  };

  const catalogByCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: CATALOG.filter((c) => c.category === cat),
  }));

  return (
    <div className="space-y-4">

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={activeCategory === cat ? D.tealBg as React.CSSProperties & { color: string } : { ...D.mute, background: "rgba(255,255,255,0.05)" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Catalog grid for active category */}
      <div className="rounded-2xl overflow-hidden" style={D.card}>
        <div className="grid grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.06)" }}>
          {catalogByCategory.find((c) => c.cat === activeCategory)?.items.map((item) => {
            const inQuote = lines.find((l) => l.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => addFromCatalog(item)}
                className="flex flex-col items-start gap-1 p-3 text-left transition-colors active:scale-[0.97]"
                style={{ background: inQuote ? "rgba(10,186,181,0.12)" : "rgba(10,15,26,0.9)" }}
              >
                <div className="flex w-full items-start justify-between gap-1">
                  <span className="text-xs font-semibold leading-tight" style={inQuote ? D.teal : D.white}>
                    {item.label}
                  </span>
                  {inQuote && (
                    <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full" style={D.tealBg as React.CSSProperties}>
                      ×{inQuote.qty}
                    </span>
                  )}
                </div>
                <span className="text-sm font-black" style={D.teal}>{fmt(item.price)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom line item */}
      <div className="rounded-2xl p-4 space-y-2" style={D.card}>
        <p className="text-xs font-semibold" style={D.mute}>Add custom item</p>
        <div className="flex gap-2">
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Description…"
            className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={D.input}
          />
          <input
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="$0"
            type="number"
            min="0"
            className="w-20 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={D.input}
          />
          <button
            onClick={addCustom}
            disabled={!customLabel.trim() || !customPrice}
            className="px-3 py-2 rounded-lg font-bold text-white disabled:opacity-40 transition-opacity"
            style={D.tealBg}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quote / line items */}
      {lines.length > 0 ? (
        <div className="rounded-2xl overflow-hidden" style={D.card}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={D.mute}>Quote — {lines.length} item{lines.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => { if (confirm("Clear all items?")) setLines([]); }}
              className="text-xs font-semibold"
              style={D.redBg}
            >
              Clear all
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {lines.map((line) => (
              <div key={line.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={D.white}>{line.label}</p>
                  <p className="text-xs" style={D.mute}>{fmt(line.price)} each</p>
                </div>
                {/* Qty controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setQty(line.id, -1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <Minus className="h-3 w-3" style={D.white} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold" style={D.white}>{line.qty}</span>
                  <button
                    onClick={() => setQty(line.id, +1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <Plus className="h-3 w-3" style={D.white} />
                  </button>
                </div>
                {/* Line total */}
                <span className="w-16 text-right text-sm font-bold shrink-0" style={D.teal}>
                  {fmt(line.price * line.qty)}
                </span>
                {/* Remove */}
                <button onClick={() => remove(line.id)} className="ml-1 p-1 rounded opacity-50 hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" style={D.white} />
                </button>
              </div>
            ))}
          </div>

          {/* Total + actions */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={D.mute}>Estimated Total</span>
              <span className="text-2xl font-black" style={D.teal}>{fmt(subtotal)}</span>
            </div>
            <button
              onClick={copyQuote}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={copied ? { background: "#22c55e", color: "#fff" } : { ...D.tealBg, color: "#fff" }}
            >
              {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Quote to Clipboard"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl px-4 py-10 text-center" style={D.card}>
          <p className="text-2xl mb-2">🔩</p>
          <p className="text-sm font-semibold mb-1" style={D.white}>No items yet</p>
          <p className="text-xs" style={D.mute}>Tap items above to build your exclusion estimate</p>
        </div>
      )}
    </div>
  );
}
