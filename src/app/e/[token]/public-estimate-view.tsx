"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatQuantity } from "@/lib/units";

// ─── Types ────────────────────────────────────────────────────────────────────

type Unit = "EACH" | "LINEAR_FT" | "SQ_FT" | "HOUR" | "FLAT" | null;

type Section = {
  key?: string;
  title?: string;
  fields?: {
    subtitle?: string;
    body?: string;
    bullets?: string[];
    rows?: string[][];
    proof?: string | string[];
    warranty?: string;
  };
};

type PublicEstimate = {
  organization: {
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    secondaryColor: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  customerName: string;
  property: { addressLine1: string; addressLine2: string | null; city: string; state: string; zip: string } | null;
  estimateNumber: string;
  title: string | null;
  scopeNotes: string | null;
  presentation: { sections?: Section[] } | null;
  lineItems: { description: string; unit: Unit; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  validUntil: string | null;
  status: string;
  canRespond: boolean;
  acceptedAt: string | null;
  acceptedByName: string | null;
  declinedAt: string | null;
};

// ─── Formatting ───────────────────────────────────────────────────────────────

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const longDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

const safeColor = (c: string | null | undefined, fallback: string) =>
  c && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : fallback;

// ─── Tracking ─────────────────────────────────────────────────────────────────

function getSessionId() {
  const make = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    const existing = localStorage.getItem("est-session");
    if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
    const id = make();
    localStorage.setItem("est-session", id);
    return id;
  } catch {
    return make();
  }
}

function useSectionTracking(token: string, enabled: boolean, sectionCount: number) {
  const sessionId = useRef<string | null>(null);
  const current = useRef<{ index: number; since: number } | null>(null);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const send = useCallback(
    (payload: Record<string, unknown>, beacon = false) => {
      if (!enabled || !sessionId.current) return;
      const url = `/api/public/estimates/${token}/events`;
      const body = JSON.stringify({ sessionId: sessionId.current, ...payload });
      if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
      } else {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    },
    [enabled, token]
  );

  const flush = useCallback(
    (beacon: boolean) => {
      const c = current.current;
      if (!c) return;
      const seconds = Math.round((Date.now() - c.since) / 1000);
      if (seconds >= 1) send({ type: "SECTION_VIEW", section: c.index, seconds }, beacon);
      current.current = { index: c.index, since: Date.now() };
    },
    [send]
  );

  // OPENED once per page load
  useEffect(() => {
    if (!enabled || sectionCount === 0) return;
    sessionId.current = getSessionId();
    send({ type: "OPENED" });
  }, [enabled, sectionCount, send]);

  // Dwell time on the section most in view
  useEffect(() => {
    if (!enabled || sectionCount === 0) return;
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(Number((e.target as HTMLElement).dataset.section), e.intersectionRatio);
        let best = -1, bestRatio = 0;
        for (const [i, r] of ratios) if (r > bestRatio) { best = i; bestRatio = r; }
        if (best < 0 || current.current?.index === best) return;
        flush(false);
        current.current = { index: best, since: Date.now() };
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    refs.current.forEach((el) => el && observer.observe(el));

    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
      else if (current.current) current.current.since = Date.now();
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, sectionCount, flush]);

  const register = (index: number) => (el: HTMLElement | null) => { refs.current[index] = el; };
  return register;
}

// ─── Signature pad ────────────────────────────────────────────────────────────

function SignaturePad({ onChange, color }: { onChange: (dataUrl: string | null) => void; color: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div>
      <canvas
        ref={canvas}
        className="w-full h-32 rounded-lg border border-gray-300 bg-white touch-none"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d")!;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const p = point(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          dirty.current = true;
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (dirty.current && canvas.current) onChange(canvas.current.toDataURL("image/png"));
        }}
      />
      <button
        type="button"
        className="mt-1 text-xs underline"
        style={{ color }}
        onClick={() => {
          const c = canvas.current;
          if (!c) return;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          dirty.current = false;
          onChange(null);
        }}
      >
        Clear signature
      </button>
    </div>
  );
}

// ─── Presentation section ─────────────────────────────────────────────────────

function PresentationSection({ section, color }: { section: Section; color: string }) {
  const f = section.fields ?? {};
  const proof = Array.isArray(f.proof) ? f.proof : f.proof ? [f.proof] : [];
  if (section.key === "cover") {
    return (
      <div className="text-center py-6">
        {section.title && <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>}
        {f.subtitle && <p className="mt-2 text-gray-600">{f.subtitle}</p>}
      </div>
    );
  }
  return (
    <div>
      {section.title && <h2 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h2>}
      {f.subtitle && <p className="text-gray-600 mb-2">{f.subtitle}</p>}
      {f.body && <p className="text-gray-700 whitespace-pre-line leading-relaxed">{f.body}</p>}
      {Array.isArray(f.bullets) && f.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {f.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-gray-700">
              <span style={{ color }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {Array.isArray(f.rows) && f.rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {f.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className={`py-2 pr-3 align-top ${j === 0 ? "font-medium text-gray-900" : "text-gray-600"}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {proof.length > 0 && (
        <div className="mt-3 space-y-2">
          {proof.map((p, i) => (
            <blockquote key={i} className="border-l-4 pl-3 italic text-gray-600" style={{ borderColor: color }}>{p}</blockquote>
          ))}
        </div>
      )}
      {f.warranty && (
        <p className="mt-3 rounded-lg p-3 text-sm text-gray-700" style={{ background: `${color}14` }}>
          <strong>Warranty:</strong> {f.warranty}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PublicEstimateView({ token, preview }: { token: string; preview: boolean }) {
  const [est, setEst] = useState<PublicEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetch(`/api/public/estimates/${token}${preview ? "?preview=1" : ""}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("This estimate link isn't valid. Please check the link or contact us.");
        if (!res.ok) throw new Error("We couldn't load this estimate. Please try again in a moment.");
        return res.json();
      })
      .then(({ data }) => setEst(data))
      .catch((e: Error) => setError(e.message));
  }, [token, preview]);

  const sections = useMemo(
    () => (Array.isArray(est?.presentation?.sections) ? est!.presentation!.sections! : []),
    [est]
  );
  // Section indexes: 0 summary, 1..n presentation, then line items, then accept.
  const sectionCount = est ? sections.length + 3 : 0;
  const register = useSectionTracking(token, !preview && !!est, sectionCount);

  const color = safeColor(est?.organization.brandColor, "#0ABAB5");
  const accent = safeColor(est?.organization.secondaryColor, color);

  const accept = async () => {
    setFormError(null);
    if (name.trim().length < 2) { setFormError("Please type your full name."); return; }
    if (!agree) { setFormError("Please check the box to accept."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/estimates/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), title: title.trim() || null, agree: true, signatureDataUrl: signature }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setEst((prev) => prev && { ...prev, status: "ACCEPTED", canRespond: false, acceptedAt: json.data.acceptedAt, acceptedByName: json.data.acceptedByName });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/estimates/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setEst((prev) => prev && { ...prev, status: "DECLINED", canRespond: false, declinedAt: json.data.declinedAt });
      setDeclining(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="max-w-sm text-center text-gray-600">{error}</p>
      </main>
    );
  }
  if (!est) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </main>
    );
  }

  const org = est.organization;
  const accepted = est.status === "ACCEPTED" || est.status === "CONVERTED";
  const address = est.property
    ? [est.property.addressLine1, est.property.addressLine2, `${est.property.city}, ${est.property.state} ${est.property.zip}`].filter(Boolean).join(", ")
    : null;
  const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {preview && (
        <div className="bg-amber-100 text-amber-900 text-center text-sm py-2 px-4">
          Preview: views aren&apos;t tracked and accepting is turned off.
        </div>
      )}

      <header style={{ background: color }} className="text-white">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center gap-3">
          {org.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
          )}
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">{org.name}</div>
            <div className="text-xs opacity-90 truncate">
              {[org.phone, org.email, org.website].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {accepted && (
          <div className="rounded-2xl p-5 bg-green-50 border border-green-200 text-green-900">
            <div className="text-lg font-bold">Thank you! This estimate is accepted. ✅</div>
            <p className="text-sm mt-1">
              Accepted{est.acceptedByName ? ` by ${est.acceptedByName}` : ""}{est.acceptedAt ? ` on ${longDate(est.acceptedAt)}` : ""}.
              {" "}{org.name} will be in touch to schedule the work.
            </p>
          </div>
        )}
        {est.status === "DECLINED" && (
          <div className="rounded-2xl p-5 bg-gray-100 border border-gray-200 text-gray-700">
            You declined this estimate{est.declinedAt ? ` on ${longDate(est.declinedAt)}` : ""}. Changed your mind? Contact {org.name}{org.phone ? ` at ${org.phone}` : ""}.
          </div>
        )}
        {est.status === "EXPIRED" && (
          <div className="rounded-2xl p-5 bg-amber-50 border border-amber-200 text-amber-900">
            This estimate expired{est.validUntil ? ` on ${longDate(est.validUntil)}` : ""}. Contact {org.name}{org.phone ? ` at ${org.phone}` : ""} for an updated quote.
          </div>
        )}

        {/* Summary */}
        <section ref={register(0)} data-section={0} className={card}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Estimate {est.estimateNumber}</div>
          <h1 className="text-2xl font-bold mt-1">{est.title || "Your estimate"}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Prepared for {est.customerName}{address ? ` · ${address}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-3xl font-extrabold" style={{ color }}>{money(est.totalAmount)}</div>
            </div>
            {est.validUntil && (
              <div className="text-sm text-gray-600">Valid until {longDate(est.validUntil)}</div>
            )}
          </div>
          {est.scopeNotes && <p className="mt-4 text-gray-700 whitespace-pre-line leading-relaxed">{est.scopeNotes}</p>}
        </section>

        {/* Presentation sections */}
        {sections.map((s, i) => (
          <section key={i} ref={register(i + 1)} data-section={i + 1} className={card}>
            <PresentationSection section={s} color={accent} />
          </section>
        ))}

        {/* Line items */}
        <section ref={register(sections.length + 1)} data-section={sections.length + 1} className={card}>
          <h2 className="text-lg font-bold mb-3">Pricing</h2>
          <ul className="divide-y divide-gray-100">
            {est.lineItems.map((li, i) => (
              <li key={i} className="py-3 flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">{li.description}</div>
                  <div className="text-sm text-gray-500">{formatQuantity(li.unit, li.quantity, li.unitPrice)}</div>
                </div>
                <div className="font-semibold whitespace-nowrap">{money(li.total)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(est.subtotal)}</span></div>
            {est.taxAmount > 0 && (
              <div className="flex justify-between text-gray-600"><span>Tax ({qty(est.taxRate)}%)</span><span>{money(est.taxAmount)}</span></div>
            )}
            {est.discountAmount > 0 && (
              <div className="flex justify-between text-gray-600"><span>Discount</span><span>−{money(est.discountAmount)}</span></div>
            )}
            <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span style={{ color }}>{money(est.totalAmount)}</span></div>
          </div>
        </section>

        {/* Accept */}
        <section ref={register(sections.length + 2)} data-section={sections.length + 2} className={card}>
          {est.canRespond ? (
            <>
              <h2 className="text-lg font-bold">Accept this estimate</h2>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-700">Your full name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} disabled={preview} autoComplete="name"
                    className="mt-1 w-full h-11 rounded-lg border border-gray-300 px-3" />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-700">Title <span className="text-gray-400">(optional)</span></span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={preview} autoComplete="organization-title"
                    className="mt-1 w-full h-11 rounded-lg border border-gray-300 px-3" />
                </label>
                <div>
                  <span className="text-sm text-gray-700">Signature <span className="text-gray-400">(optional)</span></span>
                  <div className="mt-1"><SignaturePad onChange={setSignature} color={color} /></div>
                </div>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={preview} className="mt-0.5 h-4 w-4" />
                  <span>I accept this estimate of {money(est.totalAmount)} from {org.name}.</span>
                </label>
                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <button
                  type="button"
                  onClick={accept}
                  disabled={preview || submitting}
                  className="w-full h-12 rounded-xl text-white font-bold disabled:opacity-50"
                  style={{ background: color }}
                >
                  {submitting ? "Submitting…" : "Accept estimate"}
                </button>
              </div>

              <div className="mt-4 text-center">
                {declining ? (
                  <div className="space-y-2 text-left">
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={2000}
                      placeholder="Anything you'd like us to know? (optional)"
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm" />
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setDeclining(false)} className="px-3 h-9 text-sm rounded-lg border border-gray-300">Cancel</button>
                      <button type="button" onClick={decline} disabled={preview || submitting} className="px-3 h-9 text-sm rounded-lg bg-gray-800 text-white disabled:opacity-50">Decline estimate</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setDeclining(true)} disabled={preview} className="text-sm text-gray-500 underline disabled:opacity-50">
                    Decline this estimate
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 text-center">
              {accepted
                ? `Accepted${est.acceptedByName ? ` by ${est.acceptedByName}` : ""}${est.acceptedAt ? ` on ${longDate(est.acceptedAt)}` : ""}.`
                : est.status === "DRAFT"
                  ? `This estimate hasn't been sent yet. Questions? Contact ${org.name}${org.phone ? ` at ${org.phone}` : ""}.`
                  : `Questions? Contact ${org.name}${org.phone ? ` at ${org.phone}` : ""}.`}
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-gray-400 py-4">{org.name}</footer>
      </div>
    </main>
  );
}
