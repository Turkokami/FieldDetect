"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Customer = { id: string; firstName: string; lastName: string; companyName: string | null };

const PROPERTY_TYPES = [
  { value: "SINGLE_FAMILY", label: "Single Family Home" },
  { value: "MULTI_FAMILY", label: "Multi-Family" },
  { value: "APARTMENT_COMPLEX", label: "Apartment Complex" },
  { value: "CONDOMINIUM", label: "Condominium" },
  { value: "HOTEL", label: "Hotel" },
  { value: "MOTEL", label: "Motel" },
  { value: "DORMITORY", label: "Dormitory" },
  { value: "ASSISTED_LIVING", label: "Assisted Living" },
  { value: "NURSING_HOME", label: "Nursing Home" },
  { value: "OFFICE", label: "Office" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "RETAIL", label: "Retail" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "SCHOOL", label: "School" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "OTHER", label: "Other" },
];

interface PropertyFormProps {
  prefillCustomerId?: string;
  customerName?: string;
  propertyId?: string;
  defaultValues?: {
    name?: string;
    propertyType?: string;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    totalUnits?: number | null;
    totalBuildings?: number | null;
    accessNotes?: string | null;
    gateCode?: string | null;
    parkingNotes?: string | null;
    notes?: string | null;
  };
}

export function PropertyForm({
  prefillCustomerId = "",
  customerName,
  propertyId,
  defaultValues,
}: PropertyFormProps) {
  const router = useRouter();
  const isEdit = !!propertyId;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customerId: prefillCustomerId,
    name: defaultValues?.name ?? "",
    propertyType: defaultValues?.propertyType ?? "APARTMENT_COMPLEX",
    addressLine1: defaultValues?.addressLine1 ?? "",
    addressLine2: defaultValues?.addressLine2 ?? "",
    city: defaultValues?.city ?? "",
    state: defaultValues?.state ?? "",
    zip: defaultValues?.zip ?? "",
    totalUnits: defaultValues?.totalUnits?.toString() ?? "",
    totalBuildings: defaultValues?.totalBuildings?.toString() ?? "",
    accessNotes: defaultValues?.accessNotes ?? "",
    gateCode: defaultValues?.gateCode ?? "",
    parkingNotes: defaultValues?.parkingNotes ?? "",
    notes: defaultValues?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      fetch("/api/customers?pageSize=100")
        .then((r) => r.json())
        .then((d) => setCustomers(d.data ?? []));
    }
  }, [isEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !form.customerId) { setError("Customer is required"); return; }
    if (!form.name.trim()) { setError("Property name is required"); return; }
    if (!form.addressLine1.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      setError("Full address is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = isEdit ? `/api/properties/${propertyId}` : "/api/properties";
      const method = isEdit ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: form.name,
        propertyType: form.propertyType,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || null,
        city: form.city,
        state: form.state,
        zip: form.zip,
        totalUnits: form.totalUnits ? parseInt(form.totalUnits) : null,
        totalBuildings: form.totalBuildings ? parseInt(form.totalBuildings) : null,
        accessNotes: form.accessNotes || null,
        gateCode: form.gateCode || null,
        parkingNotes: form.parkingNotes || null,
        notes: form.notes || null,
      };

      if (!isEdit) body.customerId = form.customerId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to ${isEdit ? "update" : "create"} property`);
      }

      const data = await res.json();
      toast.success(isEdit ? "Property updated" : "Property created");
      router.push(`/properties/${isEdit ? propertyId : data.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Basic Info</h2>

        {isEdit ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Customer</label>
            <div className="w-full h-10 px-3 flex items-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
              {customerName ?? "Unknown"}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Customer <span className="text-destructive">*</span>
            </label>
            <select
              name="customerId"
              value={form.customerId}
              onChange={handleChange}
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Property Name <span className="text-destructive">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Oakwood Apartments"
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Property Type</label>
            <select
              name="propertyType"
              value={form.propertyType}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Total Units</label>
            <input
              name="totalUnits"
              value={form.totalUnits}
              onChange={handleChange}
              type="number"
              min="1"
              placeholder="24"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Total Buildings</label>
            <input
              name="totalBuildings"
              value={form.totalBuildings}
              onChange={handleChange}
              type="number"
              min="1"
              placeholder="1"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Address</h2>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Street Address <span className="text-destructive">*</span>
          </label>
          <input
            name="addressLine1"
            value={form.addressLine1}
            onChange={handleChange}
            placeholder="123 Oak Street"
            required
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Suite / Apt / Unit</label>
          <input
            name="addressLine2"
            value={form.addressLine2}
            onChange={handleChange}
            placeholder="Suite 200"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              City <span className="text-destructive">*</span>
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              State <span className="text-destructive">*</span>
            </label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              maxLength={2}
              placeholder="IL"
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              ZIP <span className="text-destructive">*</span>
            </label>
            <input
              name="zip"
              value={form.zip}
              onChange={handleChange}
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Access Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Gate Code</label>
            <input
              name="gateCode"
              value={form.gateCode}
              onChange={handleChange}
              placeholder="#1234"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Parking Notes</label>
            <input
              name="parkingNotes"
              value={form.parkingNotes}
              onChange={handleChange}
              placeholder="Use visitor lot B"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Access Notes</label>
          <textarea
            name="accessNotes"
            value={form.accessNotes}
            onChange={handleChange}
            rows={2}
            placeholder="Contact manager at front office, ring buzzer 2x..."
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Internal Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Internal notes about this property..."
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
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
          {saving ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Property")}
        </button>
      </div>
    </form>
  );
}
