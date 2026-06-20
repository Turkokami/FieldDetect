"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Customer = { id: string; firstName: string; lastName: string; companyName: string | null };
type Property = { id: string; name: string; addressLine1: string };

type LineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

function NewEstimateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get("customerId") ?? "";
  const prefillPropertyId = searchParams.get("propertyId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [customerId, setCustomerId] = useState(prefillCustomerId);
  const [propertyId, setPropertyId] = useState(prefillPropertyId);
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState("BED_BUG_INSPECTION");
  const [scopeNotes, setScopeNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers?pageSize=100")
      .then((r) => r.json())
      .then((d) => setCustomers(d.data ?? []));
  }, []);

  useEffect(() => {
    if (!customerId) { setProperties([]); return; }
    fetch(`/api/properties?customerId=${customerId}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => setProperties(d.data ?? []));
  }, [customerId]);

  const addLineItem = () =>
    setLineItems((items) => [...items, { description: "", quantity: "1", unitPrice: "" }]);

  const removeLineItem = (i: number) =>
    setLineItems((items) => items.filter((_, idx) => idx !== i));

  const updateLineItem = (i: number, field: keyof LineItem, value: string) =>
    setLineItems((items) => items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const subtotal = lineItems.reduce((s, li) => {
    const qty = parseFloat(li.quantity) || 0;
    const price = parseFloat(li.unitPrice) || 0;
    return s + qty * price;
  }, 0);
  const taxAmt = subtotal * (parseFloat(taxRate) || 0) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + taxAmt - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        customerId,
        propertyId: propertyId || null,
        title: title || null,
        serviceType,
        scopeNotes: scopeNotes || null,
        taxRate: parseFloat(taxRate) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        lineItems: lineItems.map((li, idx) => ({
          description: li.description,
          quantity: parseFloat(li.quantity) || 1,
          unitPrice: parseFloat(li.unitPrice) || 0,
          sortOrder: idx,
        })),
      };
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create estimate");
      router.push(`/estimates/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40";
  const labelClass = "block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Estimate</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a quote to send to a customer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Property */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Customer *</label>
              <select
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); setPropertyId(""); }}
                required
                className={inputClass}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ?? `${c.firstName} ${c.lastName}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Property</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={inputClass}
                disabled={!customerId}
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bed Bug Inspection Package"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Service Type</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
                <option value="BED_BUG_INSPECTION">Bed Bug Inspection</option>
                <option value="BED_BUG_TREATMENT">Bed Bug Treatment</option>
                <option value="GENERAL_PEST_INSPECTION">General Pest Inspection</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="FOLLOW_UP">Follow-Up</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Scope of Work / Notes</label>
            <textarea
              value={scopeNotes}
              onChange={(e) => setScopeNotes(e.target.value)}
              rows={3}
              placeholder="Describe the work to be performed…"
              className={inputClass}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Line Items</h2>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={li.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    placeholder="Description"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="w-16">
                  <input
                    type="number"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="Qty"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    value={li.unitPrice}
                    onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Unit price"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="w-24 px-3 py-2 text-sm font-semibold text-right text-foreground">
                  ${((parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0)).toFixed(2)}
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(i)}
                    className="px-2 py-2 text-muted-foreground hover:text-red-500 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLineItem}
            className="text-sm font-semibold mt-1"
            style={{ color: "#0ABAB5" }}
          >
            + Add Line Item
          </button>

          {/* Totals */}
          <div className="border-t border-border pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Tax Rate (%)</span>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                className="w-24 px-2 py-1 rounded border border-border text-right text-sm bg-background"
              />
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Discount ($)</span>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-24 px-2 py-1 rounded border border-border text-right text-sm bg-background"
              />
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span>Total</span>
              <span style={{ color: "#0ABAB5" }}>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "#0ABAB5" }}
          >
            {saving ? "Creating…" : "Create Estimate"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewEstimatePage() {
  return (
    <Suspense>
      <NewEstimateForm />
    </Suspense>
  );
}
