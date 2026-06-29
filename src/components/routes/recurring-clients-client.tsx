"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, User2, RefreshCw } from "lucide-react";

type Technician = { id: string; firstName: string; lastName: string };
type RecurringClient = {
  id: string;
  serviceType: string;
  frequency: string;
  notes: string | null;
  routeOrder: number;
  customer: { firstName: string; lastName: string; companyName: string | null };
  property: { name: string; addressLine1: string; city: string } | null;
  technician: { id: string; firstName: string; lastName: string } | null;
};

type Customer = { id: string; firstName: string; lastName: string; companyName: string | null };
type Property = { id: string; name: string; addressLine1: string };

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "Bed Bug K9",
  BED_BUG_TREATMENT: "Bed Bug Treatment",
  GOOSE_CONTROL: "Goose Control",
  BIRD_EXCLUSION: "Bird Exclusion",
  RODENT_INSPECTION: "Rodent K9",
  RODENT_EXCLUSION: "Rodent Exclusion",
  WILDLIFE_INSPECTION: "Wildlife Inspection",
  WILDLIFE_REMOVAL: "Wildlife Removal",
  GENERAL_PEST_INSPECTION: "General Pest",
  OTHER: "Other",
};

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: "Weekly", BIWEEKLY: "Bi-Weekly", MONTHLY: "Monthly",
  QUARTERLY: "Quarterly", ANNUALLY: "Annually",
};

const ALL_SERVICE_TYPES = Object.entries(SERVICE_LABELS);
const ALL_FREQUENCIES = Object.entries(FREQ_LABELS);

type Props = {
  initialClients: RecurringClient[];
  technicians: Technician[];
};

export function RecurringClientsClient({ initialClients, technicians }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [addCustomers, setAddCustomers] = useState<Customer[]>([]);
  const [addProperties, setAddProperties] = useState<Property[]>([]);
  const [addCustomerId, setAddCustomerId] = useState("");
  const [addPropertyId, setAddPropertyId] = useState("");
  const [addTechId, setAddTechId] = useState("");
  const [addService, setAddService] = useState("BED_BUG_INSPECTION");
  const [addFreq, setAddFreq] = useState("MONTHLY");
  const [addNotes, setAddNotes] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Edit state
  const [editTechId, setEditTechId] = useState<string>("");
  const [editFreq, setEditFreq] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  const openAdd = async () => {
    if (addCustomers.length === 0) {
      const r = await fetch("/api/customers?pageSize=200");
      const d = await r.json();
      setAddCustomers(d.data ?? []);
    }
    setShowAdd(true);
  };

  const onCustomerChange = async (cid: string) => {
    setAddCustomerId(cid);
    setAddPropertyId("");
    if (!cid) { setAddProperties([]); return; }
    const r = await fetch(`/api/properties?customerId=${cid}&pageSize=50`);
    const d = await r.json();
    setAddProperties(d.data ?? []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    try {
      const res = await fetch("/api/recurring-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: addCustomerId,
          propertyId: addPropertyId || null,
          technicianId: addTechId || null,
          serviceType: addService,
          frequency: addFreq,
          notes: addNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClients((prev) => [...prev, data.data]);
      setShowAdd(false);
      setAddCustomerId(""); setAddPropertyId(""); setAddTechId("");
      setAddService("BED_BUG_INSPECTION"); setAddFreq("MONTHLY"); setAddNotes("");
    } catch {
      // ignore — form stays open
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (client: RecurringClient) => {
    setEditingId(client.id);
    setEditTechId(client.technician?.id ?? "");
    setEditFreq(client.frequency);
  };

  const handleEdit = async (id: string) => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/recurring-clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: editTechId || null, frequency: editFreq }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClients((prev) => prev.map((c) => c.id === id ? data.data : c));
      setEditingId(null);
    } catch {
      // ignore
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this recurring client from routes?")) return;
    await fetch(`/api/recurring-clients/${id}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSchedule = (client: RecurringClient) => {
    const params = new URLSearchParams({ customerId: client.customer.companyName ?? `${client.customer.firstName} ${client.customer.lastName}` });
    router.push(`/scheduling/new?${params}`);
  };

  // Group by technician
  const grouped = new Map<string, RecurringClient[]>();
  for (const c of clients) {
    const key = c.technician
      ? `${c.technician.firstName} ${c.technician.lastName}__${c.technician.id}`
      : "Unassigned__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Recurring clients grouped by assigned handler. Changes take effect on the next scheduled service.
        </p>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Recurring Client</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer *</label>
                <select value={addCustomerId} onChange={(e) => onCustomerChange(e.target.value)} required className={inp}>
                  <option value="">Select customer…</option>
                  {addCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName ?? `${c.firstName} ${c.lastName}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Property</label>
                <select value={addPropertyId} onChange={(e) => setAddPropertyId(e.target.value)} disabled={!addCustomerId} className={inp}>
                  <option value="">All properties / TBD</option>
                  {addProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Assigned Handler</label>
                <select value={addTechId} onChange={(e) => setAddTechId(e.target.value)} className={inp}>
                  <option value="">Unassigned</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Service Type</label>
                <select value={addService} onChange={(e) => setAddService(e.target.value)} className={inp}>
                  {ALL_SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Frequency</label>
                <select value={addFreq} onChange={(e) => setAddFreq(e.target.value)} className={inp}>
                  {ALL_FREQUENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
              <input type="text" value={addNotes} onChange={(e) => setAddNotes(e.target.value)}
                placeholder="e.g. Access code #1234, prefer morning slots" className={inp} />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:underline">Cancel</button>
              <button type="submit" disabled={addSaving}
                className="px-5 h-9 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {addSaving ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground mb-1">No recurring clients yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your recurring customers to assign handlers and track their service routes.
          </p>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add First Client
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([key, groupClients]) => {
            const techName = key.split("__")[0];
            const initials = techName === "Unassigned" ? "?" : techName.split(" ").map((n) => n[0]).join("");
            return (
              <div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Tech header */}
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {initials}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground text-sm">{techName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {groupClients.length} client{groupClients.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Clients */}
                <div className="divide-y divide-border">
                  {groupClients.map((client) => {
                    const name = client.customer.companyName ?? `${client.customer.firstName} ${client.customer.lastName}`;
                    const isEditing = editingId === client.id;
                    return (
                      <div key={client.id} className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-3 flex-wrap">
                            <select value={editTechId} onChange={(e) => setEditTechId(e.target.value)}
                              className="h-8 px-2 rounded border border-border bg-background text-sm text-foreground">
                              <option value="">Unassigned</option>
                              {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                            </select>
                            <select value={editFreq} onChange={(e) => setEditFreq(e.target.value)}
                              className="h-8 px-2 rounded border border-border bg-background text-sm text-foreground">
                              {ALL_FREQUENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            <button onClick={() => handleEdit(client.id)} disabled={editSaving}
                              className="h-8 px-3 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                              {editSaving ? "Saving…" : "Save"}
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">{name}</div>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                                {client.property && (
                                  <span>{client.property.name} · {client.property.city}</span>
                                )}
                                <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {SERVICE_LABELS[client.serviceType] ?? client.serviceType}
                                </span>
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="h-2.5 w-2.5" />
                                  {FREQ_LABELS[client.frequency] ?? client.frequency}
                                </span>
                                {client.notes && <span className="text-muted-foreground italic truncate max-w-xs">{client.notes}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Link
                                href={`/scheduling/new?customerId=${client.customer.companyName ?? ""}`}
                                className="h-7 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors inline-flex items-center"
                                title="Schedule appointment"
                              >
                                Schedule
                              </Link>
                              <button onClick={() => startEdit(client)} title="Edit"
                                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(client.id)} title="Remove"
                                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
