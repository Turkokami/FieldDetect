"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Customer = { id: string; firstName: string; lastName: string; companyName: string | null };
type Property = { id: string; name: string; addressLine1: string };
type Appointment = { id: string; scheduledDate: string; serviceType: string; property: { name: string } };

type LineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get("customerId") ?? "";
  const prefillAppointmentId = searchParams.get("appointmentId") ?? "";
  const prefillPropertyId = searchParams.get("propertyId") ?? "";
  const prefillInspectionId = searchParams.get("inspectionId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [customerId, setCustomerId] = useState(prefillCustomerId);
  const [propertyId, setPropertyId] = useState(prefillPropertyId);
  const [appointmentId, setAppointmentId] = useState(prefillAppointmentId);
  const [inspectionId, setInspectionId] = useState(prefillInspectionId);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
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
    if (!customerId) { setProperties([]); setAppointments([]); return; }
    Promise.all([
      fetch(`/api/properties?customerId=${customerId}&pageSize=50`).then((r) => r.json()),
      fetch(`/api/appointments?customerId=${customerId}&pageSize=50`).then((r) => r.json()),
    ]).then(([pd, ad]) => {
      setProperties(pd.data ?? []);
      setAppointments(ad.data ?? []);
    });
  }, [customerId]);

  const addLineItem = () => {
    setLineItems((items) => [...items, { description: "", quantity: "1", unitPrice: "" }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((items) => items.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setError("Customer is required"); return; }
    if (lineItems.every((i) => !i.description.trim())) { setError("At least one line item is required"); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId: propertyId || undefined,
          appointmentId: appointmentId || undefined,
          inspectionId: inspectionId || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          taxRate: parseFloat(taxRate) / 100,
          notes: notes || undefined,
          lineItems: lineItems
            .filter((i) => i.description.trim())
            .map((item, idx) => ({
              description: item.description,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              sortOrder: idx,
            })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create invoice");
      }

      const data = await res.json();
      router.push(`/invoices/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Customer <span className="text-destructive">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); setPropertyId(""); setAppointmentId(""); }}
                required
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}{c.companyName ? ` — ${c.companyName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Property</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={!customerId}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="">None</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Linked Appointment</label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                disabled={!customerId}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="">None</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.scheduledDate).toLocaleDateString()} — {a.property?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Line Items</h2>

          <div className="space-y-3">
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  {i === 0 && <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>}
                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    placeholder="Bed bug inspection — 12 units"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs font-medium text-muted-foreground mb-1">Qty</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Price ($)</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {i === 0 && <div className="mb-1 h-4" />}
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="mt-3 text-sm text-primary hover:underline"
          >
            + Add Line Item
          </button>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-16 h-7 px-2 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <span className="text-sm text-foreground ml-auto">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">Notes (visible to customer)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, thank you message, etc."
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}
