"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, Calendar, X, ArrowRight } from "lucide-react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
};

type Property = {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  customer: { firstName: string; lastName: string; companyName: string | null };
};

type Appointment = {
  id: string;
  serviceType: string;
  status: string;
  scheduledDate: string | null;
  customer: { firstName: string; lastName: string; companyName: string | null };
  property: { name: string; city: string } | null;
};

type SearchResults = {
  customers: Customer[];
  properties: Property[];
  appointments: Appointment[];
};

type ResultItem =
  | { type: "customer"; data: Customer }
  | { type: "property"; data: Property }
  | { type: "appointment"; data: Appointment };

function flattenResults(r: SearchResults): ResultItem[] {
  return [
    ...r.customers.map((d) => ({ type: "customer" as const, data: d })),
    ...r.properties.map((d) => ({ type: "property" as const, data: d })),
    ...r.appointments.map((d) => ({ type: "appointment" as const, data: d })),
  ];
}

function getHref(item: ResultItem): string {
  if (item.type === "customer") return `/customers/${item.data.id}`;
  if (item.type === "property") return `/properties/${item.data.id}`;
  return `/scheduling/${item.data.id}`;
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function customerName(c: { firstName: string; lastName: string; companyName: string | null }) {
  return c.companyName ?? `${c.firstName} ${c.lastName}`;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(json.data ?? null);
        setActiveIdx(0);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  const items = results ? flattenResults(results) : [];

  const navigate = useCallback((item: ResultItem) => {
    router.push(getHref(item));
    onClose();
  }, [router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && items[activeIdx]) { navigate(items[activeIdx]); }
  };

  if (!open) return null;

  const hasResults = results && items.length > 0;
  const noResults = results && items.length === 0 && query.length >= 2 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, properties, appointments..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" />
          )}
          {!loading && query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {hasResults && (
          <div className="max-h-[420px] overflow-y-auto py-2">
            {/* Customers */}
            {results!.customers.length > 0 && (
              <div>
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Customers</span>
                </div>
                {results!.customers.map((c, i) => {
                  const idx = i;
                  const isActive = activeIdx === idx;
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate({ type: "customer", data: c })}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Users className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {c.companyName ?? `${c.firstName} ${c.lastName}`}
                        </div>
                        {c.companyName && (
                          <div className="text-xs text-muted-foreground">{c.firstName} {c.lastName}</div>
                        )}
                        {c.email && <div className="text-xs text-muted-foreground truncate">{c.email}</div>}
                      </div>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Properties */}
            {results!.properties.length > 0 && (
              <div>
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Properties</span>
                </div>
                {results!.properties.map((p, i) => {
                  const idx = results!.customers.length + i;
                  const isActive = activeIdx === idx;
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate({ type: "property", data: p })}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    >
                      <div className="h-7 w-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.addressLine1}, {p.city}, {p.state}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customerName(p.customer)}
                        </div>
                      </div>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Appointments */}
            {results!.appointments.length > 0 && (
              <div>
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Appointments</span>
                </div>
                {results!.appointments.map((a, i) => {
                  const idx = results!.customers.length + results!.properties.length + i;
                  const isActive = activeIdx === idx;
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate({ type: "appointment", data: a })}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    >
                      <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {a.serviceType.replace(/_/g, " ")} — {customerName(a.customer)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.property?.name}{a.scheduledDate ? ` · ${fmtDate(a.scheduledDate)}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.status.replace(/_/g, " ")}
                        </div>
                      </div>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {noResults && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!results && !loading && query.length < 2 && (
          <div className="py-8 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Search across customers, properties, and appointments
            </p>
            <p className="text-xs text-muted-foreground">
              Type at least 2 characters to search
            </p>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded border border-border font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded border border-border font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded border border-border font-mono">Esc</kbd> close
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="px-1 rounded border border-border font-mono">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
