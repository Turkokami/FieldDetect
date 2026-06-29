"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";

type Property = {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
};

const SERVICE_TYPES = ["One-Time", "Monthly", "Quarterly", "Annual", "Other"];

export function GenerateContractButton({
  customerId,
  properties,
}: {
  customerId: string;
  properties: Property[];
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "custom");
  const [customAddress, setCustomAddress] = useState("");
  const [serviceType, setServiceType] = useState("One-Time");
  const [otherType, setOtherType] = useState("");
  const [pricePerService, setPricePerService] = useState("");
  const [numServices, setNumServices] = useState("1");

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const serviceAddress =
    propertyId === "custom"
      ? customAddress
      : selectedProperty
      ? `${selectedProperty.addressLine1}, ${selectedProperty.city}, ${selectedProperty.state} ${selectedProperty.zip}`
      : customAddress;

  const price = parseFloat(pricePerService) || 0;
  const count = parseInt(numServices) || 1;
  const total = price * count;

  const finalServiceType = serviceType === "Other" ? otherType || "Other" : serviceType;

  const handleGenerate = async () => {
    if (!serviceAddress.trim()) {
      toast.error("Service address is required");
      return;
    }
    if (!pricePerService || price <= 0) {
      toast.error("Enter a valid price per service");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceAddress,
          serviceType: finalServiceType,
          pricePerService: price,
          numServices: count,
          totalPrice: total,
        }),
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `service-agreement.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Contract downloaded");
      setOpen(false);
    } catch {
      toast.error("Failed to generate contract");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <FileText className="h-4 w-4" />
        Contract
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-background rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Generate Service Agreement</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Property / address */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Service Address
                </label>
                {properties.length > 0 ? (
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.addressLine1}, {p.city}
                      </option>
                    ))}
                    <option value="custom">Enter custom address…</option>
                  </select>
                ) : null}
                {(propertyId === "custom" || properties.length === 0) && (
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="123 Main St, Seattle, WA 98101"
                    className="w-full h-9 px-3 mt-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>

              {/* Service type */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Service Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {serviceType === "Other" && (
                  <input
                    type="text"
                    value={otherType}
                    onChange={(e) => setOtherType(e.target.value)}
                    placeholder="Describe service type…"
                    className="w-full h-9 px-3 mt-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Price Per Service ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerService}
                    onChange={(e) => setPricePerService(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Number of Services
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={numServices}
                    onChange={(e) => setNumServices(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Total preview */}
              {price > 0 && (
                <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Agreement Price</span>
                  <span className="font-bold text-foreground">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 pb-5 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 h-9 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
