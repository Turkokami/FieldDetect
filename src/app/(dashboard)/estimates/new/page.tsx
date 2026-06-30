"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Customer = { id: string; firstName: string; lastName: string; companyName: string | null };
type Property = { id: string; name: string; addressLine1: string };
type LineItem = { description: string; quantity: string; unitPrice: string };

// ── Service Module types ──────────────────────────────────────────────────────

type BedBugData = {
  facilityType: string;
  totalUnits: string;
  floors: string;
  commonAreas: string[];
  dogsNeeded: string;
  daysEstimated: string;
  pricePerUnit: string;
  commonAreaPrice: string;
  setupFee: string;
};

type GooseData = {
  acreage: string;
  pondCount: string;
  frequency: string;
  visitCount: string;
  includesSetup: boolean;
  pricePerVisit: string;
  setupFee: string;
};

type BirdExclusionData = {
  buildingType: string;
  linearFeet: string;
  nestingSites: string;
  method: string;
  accessLevel: string;
  pricePerFoot: string;
  setupFee: string;
  perSiteFee: string;
};

type RodentData = {
  facilityType: string;
  sqFootage: string;
  floors: string;
  dogsNeeded: string;
  assessmentOnly: boolean;
  pricePerSqFt: string;
  baseFee: string;
};

const COMMON_AREAS_OPTIONS = [
  "Lobby / Reception", "Laundry Room", "Fitness Center / Gym",
  "Pool Area", "Restaurant / Cafeteria", "Conference Rooms",
  "Storage / Utility", "Hallways (all floors)", "Parking Garage",
];

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: "Weekly", BIWEEKLY: "Bi-Weekly", MONTHLY: "Monthly",
  QUARTERLY: "Quarterly", ANNUALLY: "Annually",
};

function generateBedBugItems(d: BedBugData): LineItem[] {
  const items: LineItem[] = [];
  const setup = parseFloat(d.setupFee) || 0;
  if (setup > 0) items.push({ description: "Inspection Setup / Mobilization Fee", quantity: "1", unitPrice: d.setupFee });
  const units = parseInt(d.totalUnits) || 0;
  if (units > 0 && d.pricePerUnit) {
    items.push({ description: `K9 Bed Bug Inspection – ${d.facilityType || "Facility"} (${units} rooms/units)`, quantity: String(units), unitPrice: d.pricePerUnit });
  }
  if (d.commonAreas.length > 0 && d.commonAreaPrice) {
    d.commonAreas.forEach((area) => {
      items.push({ description: `Common Area Inspection – ${area}`, quantity: "1", unitPrice: d.commonAreaPrice });
    });
  }
  const dogs = parseInt(d.dogsNeeded) || 1;
  const days = parseInt(d.daysEstimated) || 1;
  if (dogs > 1 || days > 1) {
    items.push({ description: `Field Operations – ${dogs} K9 Team${dogs > 1 ? "s" : ""} × ${days} Day${days > 1 ? "s" : ""}`, quantity: String(dogs * days), unitPrice: "0" });
  }
  return items;
}

function generateGooseItems(d: GooseData): LineItem[] {
  const items: LineItem[] = [];
  if (d.includesSetup && d.setupFee) {
    items.push({ description: "Initial Goose Deterrence Assessment & Site Setup", quantity: "1", unitPrice: d.setupFee });
  }
  const visits = parseInt(d.visitCount) || 1;
  if (d.pricePerVisit) {
    items.push({ description: `Goose Deterrence Service – ${FREQ_LABELS[d.frequency] || d.frequency} (${parseFloat(d.acreage) || 0} acres)`, quantity: String(visits), unitPrice: d.pricePerVisit });
  }
  const ponds = parseInt(d.pondCount) || 0;
  if (ponds > 0) {
    items.push({ description: "Water Feature / Pond Management (per feature)", quantity: String(ponds), unitPrice: "0" });
  }
  return items;
}

function generateBirdItems(d: BirdExclusionData): LineItem[] {
  const items: LineItem[] = [];
  if (d.setupFee) {
    items.push({ description: `Bird Exclusion Site Assessment – ${d.buildingType || "Building"}`, quantity: "1", unitPrice: d.setupFee });
  }
  const feet = parseFloat(d.linearFeet) || 0;
  if (feet > 0 && d.pricePerFoot) {
    items.push({ description: `${d.method || "Bird Exclusion"} Installation – Linear Footage`, quantity: String(feet), unitPrice: d.pricePerFoot });
  }
  const sites = parseInt(d.nestingSites) || 0;
  if (sites > 0 && d.perSiteFee) {
    items.push({ description: `Active Nesting Site Treatment & Cleanup`, quantity: String(sites), unitPrice: d.perSiteFee });
  }
  if (d.accessLevel !== "GROUND") {
    const accessLabel = d.accessLevel === "LIFT" ? "Boom Lift / Aerial Work Platform" : "Rope Access / High-Rise Equipment";
    items.push({ description: `Access Equipment – ${accessLabel}`, quantity: "1", unitPrice: "0" });
  }
  return items;
}

function generateRodentItems(d: RodentData): LineItem[] {
  const items: LineItem[] = [];
  if (d.baseFee) {
    items.push({ description: `K9 Rodent Detection Assessment – ${d.facilityType || "Facility"}`, quantity: "1", unitPrice: d.baseFee });
  }
  const sqft = parseFloat(d.sqFootage) || 0;
  if (sqft > 0 && d.pricePerSqFt) {
    items.push({ description: `Rodent Inspection – ${d.facilityType} (${sqft.toLocaleString()} sq ft)`, quantity: String(sqft), unitPrice: d.pricePerSqFt });
  }
  if (!d.assessmentOnly) {
    const floors = parseInt(d.floors) || 1;
    if (floors > 1) {
      items.push({ description: `Multi-Floor Exclusion Survey (${floors} floors)`, quantity: String(floors), unitPrice: "0" });
    }
    items.push({ description: "Rodent Exclusion Report & Remediation Recommendations", quantity: "1", unitPrice: "0" });
  }
  return items;
}

// ── Module components ─────────────────────────────────────────────────────────

function BedBugModule({ data, onChange }: { data: BedBugData; onChange: (d: BedBugData) => void }) {
  const set = (field: keyof BedBugData, value: string | string[]) => onChange({ ...data, [field]: value });
  const toggleArea = (area: string) => {
    const next = data.commonAreas.includes(area)
      ? data.commonAreas.filter((a) => a !== area)
      : [...data.commonAreas, area];
    set("commonAreas", next);
  };
  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Facility Type</label>
          <select value={data.facilityType} onChange={(e) => set("facilityType", e.target.value)} className={inp}>
            <option value="">Select…</option>
            {["Hotel", "Motel", "Apartment Complex", "Dormitory", "Assisted Living", "Office Building", "Warehouse", "Hospital", "School", "Other"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Total Rooms / Units</label>
          <input type="number" value={data.totalUnits} onChange={(e) => set("totalUnits", e.target.value)} min="1" placeholder="e.g. 120" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide"># of Floors</label>
          <input type="number" value={data.floors} onChange={(e) => set("floors", e.target.value)} min="1" placeholder="e.g. 5" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">K9 Teams Needed</label>
          <input type="number" value={data.dogsNeeded} onChange={(e) => set("dogsNeeded", e.target.value)} min="1" max="10" placeholder="e.g. 2" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Estimated Days</label>
          <input type="number" value={data.daysEstimated} onChange={(e) => set("daysEstimated", e.target.value)} min="1" placeholder="e.g. 1" className={inp} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Common Areas to Inspect</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_AREAS_OPTIONS.map((area) => (
            <button key={area} type="button" onClick={() => toggleArea(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${data.commonAreas.includes(area) ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}>
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Setup / Mobilization Fee ($)</label>
          <input type="number" value={data.setupFee} onChange={(e) => set("setupFee", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Price Per Room/Unit ($)</label>
          <input type="number" value={data.pricePerUnit} onChange={(e) => set("pricePerUnit", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Common Area Fee ($)</label>
          <input type="number" value={data.commonAreaPrice} onChange={(e) => set("commonAreaPrice", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
      </div>
    </div>
  );
}

function GooseModule({ data, onChange }: { data: GooseData; onChange: (d: GooseData) => void }) {
  const set = (field: keyof GooseData, value: string | boolean) => onChange({ ...data, [field]: value });
  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Property Acreage</label>
          <input type="number" value={data.acreage} onChange={(e) => set("acreage", e.target.value)} min="0.1" step="0.1" placeholder="e.g. 5.5" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide"># of Ponds / Water Features</label>
          <input type="number" value={data.pondCount} onChange={(e) => set("pondCount", e.target.value)} min="0" placeholder="0" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Service Frequency</label>
          <select value={data.frequency} onChange={(e) => set("frequency", e.target.value)} className={inp}>
            {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide"># of Visits Quoted</label>
          <input type="number" value={data.visitCount} onChange={(e) => set("visitCount", e.target.value)} min="1" placeholder="e.g. 12" className={inp} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.includesSetup} onChange={(e) => set("includesSetup", e.target.checked)} className="rounded border-border" />
        <span className="text-sm text-foreground">Include initial deterrence setup / assessment visit</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
        {data.includesSetup && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Setup Visit Fee ($)</label>
            <input type="number" value={data.setupFee} onChange={(e) => set("setupFee", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Price Per Visit ($)</label>
          <input type="number" value={data.pricePerVisit} onChange={(e) => set("pricePerVisit", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
      </div>
    </div>
  );
}

function BirdExclusionModule({ data, onChange }: { data: BirdExclusionData; onChange: (d: BirdExclusionData) => void }) {
  const set = (field: keyof BirdExclusionData, value: string) => onChange({ ...data, [field]: value });
  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Building Type</label>
          <select value={data.buildingType} onChange={(e) => set("buildingType", e.target.value)} className={inp}>
            <option value="">Select…</option>
            {["Commercial Office", "Warehouse / Industrial", "Retail / Shopping Center", "Hotel / Hospitality", "Hospital / Medical", "School / University", "Government / Municipal", "Residential Complex", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Linear Feet (problem areas)</label>
          <input type="number" value={data.linearFeet} onChange={(e) => set("linearFeet", e.target.value)} min="0" placeholder="e.g. 250" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide"># of Active Nesting Sites</label>
          <input type="number" value={data.nestingSites} onChange={(e) => set("nestingSites", e.target.value)} min="0" placeholder="0" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Primary Exclusion Method</label>
          <select value={data.method} onChange={(e) => set("method", e.target.value)} className={inp}>
            <option value="">Select…</option>
            {["Stainless Steel Spikes", "Heavy-Duty Netting", "Tension Wire System", "Optical Gel", "Electric Track", "Combination System"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Access Level Required</label>
          <select value={data.accessLevel} onChange={(e) => set("accessLevel", e.target.value)} className={inp}>
            <option value="GROUND">Ground Level</option>
            <option value="LIFT">Lift / Aerial Work Platform</option>
            <option value="ROPE">Rope Access / High-Rise</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Assessment / Setup Fee ($)</label>
          <input type="number" value={data.setupFee} onChange={(e) => set("setupFee", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Price Per Linear Foot ($)</label>
          <input type="number" value={data.pricePerFoot} onChange={(e) => set("pricePerFoot", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Per Nesting Site Fee ($)</label>
          <input type="number" value={data.perSiteFee} onChange={(e) => set("perSiteFee", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
      </div>
    </div>
  );
}

function RodentModule({ data, onChange }: { data: RodentData; onChange: (d: RodentData) => void }) {
  const set = (field: keyof RodentData, value: string | boolean) => onChange({ ...data, [field]: value });
  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Facility Type</label>
          <select value={data.facilityType} onChange={(e) => set("facilityType", e.target.value)} className={inp}>
            <option value="">Select…</option>
            {["Restaurant / Food Service", "Warehouse / Distribution", "Hotel / Hospitality", "Office Building", "Retail / Grocery", "Residential Complex", "Industrial / Manufacturing", "Healthcare / Hospital", "School / University", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Total Sq Footage</label>
          <input type="number" value={data.sqFootage} onChange={(e) => set("sqFootage", e.target.value)} min="100" placeholder="e.g. 50000" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide"># of Floors</label>
          <input type="number" value={data.floors} onChange={(e) => set("floors", e.target.value)} min="1" placeholder="e.g. 3" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">K9 Teams Needed</label>
          <input type="number" value={data.dogsNeeded} onChange={(e) => set("dogsNeeded", e.target.value)} min="1" max="10" placeholder="e.g. 2" className={inp} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.assessmentOnly} onChange={(e) => set("assessmentOnly", e.target.checked)} className="rounded border-border" />
        <span className="text-sm text-foreground">Assessment / detection only (no exclusion services)</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Base Assessment Fee ($)</label>
          <input type="number" value={data.baseFee} onChange={(e) => set("baseFee", e.target.value)} min="0" step="0.01" placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Price Per Sq Ft ($)</label>
          <input type="number" value={data.pricePerSqFt} onChange={(e) => set("pricePerSqFt", e.target.value)} min="0" step="0.001" placeholder="0.000" className={inp} />
        </div>
      </div>
    </div>
  );
}

const SERVICE_MODULES: Record<string, string> = {
  BED_BUG_INSPECTION: "K9 Bed Bug Detection",
  BED_BUG_TREATMENT: "K9 Bed Bug Detection",
  GOOSE_CONTROL: "Goose Deterrence",
  BIRD_EXCLUSION: "Bird Exclusion",
  RODENT_INSPECTION: "K9 Rodent Detection",
  RODENT_EXCLUSION: "Rodent Exclusion",
};

const ALL_SERVICE_TYPES = [
  { value: "BED_BUG_INSPECTION", label: "Bed Bug K9 Inspection" },
  { value: "BED_BUG_TREATMENT", label: "Bed Bug Treatment" },
  { value: "GOOSE_CONTROL", label: "Goose Control", module: "GOOSE_CONTROL" },
  { value: "BIRD_EXCLUSION", label: "Bird Exclusion", module: "BIRD_EXCLUSION" },
  { value: "RODENT_INSPECTION", label: "Rodent K9 Inspection", module: "RODENT_INSPECTION" },
  { value: "RODENT_EXCLUSION", label: "Rodent Exclusion", module: "RODENT_EXCLUSION" },
  { value: "WILDLIFE_INSPECTION", label: "Wildlife Inspection", module: "WILDLIFE" },
  { value: "WILDLIFE_REMOVAL", label: "Wildlife Removal", module: "WILDLIFE" },
  { value: "GENERAL_PEST_INSPECTION", label: "General Pest Inspection" },
  { value: "OTHER", label: "Other / Custom" },
];

// ── Main form ─────────────────────────────────────────────────────────────────

function NewEstimateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get("customerId") ?? "";
  const prefillPropertyId = searchParams.get("propertyId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);

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

  // Module states
  const [bedBugData, setBedBugData] = useState<BedBugData>({
    facilityType: "", totalUnits: "", floors: "", commonAreas: [],
    dogsNeeded: "1", daysEstimated: "1", pricePerUnit: "", commonAreaPrice: "", setupFee: "",
  });
  const [gooseData, setGooseData] = useState<GooseData>({
    acreage: "", pondCount: "0", frequency: "MONTHLY", visitCount: "12",
    includesSetup: true, pricePerVisit: "", setupFee: "",
  });
  const [birdData, setBirdData] = useState<BirdExclusionData>({
    buildingType: "", linearFeet: "", nestingSites: "0", method: "",
    accessLevel: "GROUND", pricePerFoot: "", setupFee: "", perSiteFee: "",
  });
  const [rodentData, setRodentData] = useState<RodentData>({
    facilityType: "", sqFootage: "", floors: "1", dogsNeeded: "1",
    assessmentOnly: true, pricePerSqFt: "", baseFee: "",
  });

  useEffect(() => {
    fetch("/api/customers?pageSize=200")
      .then((r) => r.json())
      .then((d) => setCustomers(d.data ?? []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setEnabledModules((d.data?.enabledModules as string[]) ?? []))
      .catch(() => setEnabledModules([]));
  }, []);

  useEffect(() => {
    if (!customerId) { setProperties([]); return; }
    fetch(`/api/properties?customerId=${customerId}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => setProperties(d.data ?? []));
  }, [customerId]);

  const generateFromModule = () => {
    let generated: LineItem[] = [];
    if (serviceType === "BED_BUG_INSPECTION" || serviceType === "BED_BUG_TREATMENT") {
      generated = generateBedBugItems(bedBugData);
    } else if (serviceType === "GOOSE_CONTROL") {
      generated = generateGooseItems(gooseData);
    } else if (serviceType === "BIRD_EXCLUSION") {
      generated = generateBirdItems(birdData);
    } else if (serviceType === "RODENT_INSPECTION" || serviceType === "RODENT_EXCLUSION") {
      generated = generateRodentItems(rodentData);
    }
    if (generated.length > 0) {
      setLineItems(generated);
    }
  };

  const addLineItem = () => setLineItems((items) => [...items, { description: "", quantity: "1", unitPrice: "" }]);
  const removeLineItem = (i: number) => setLineItems((items) => items.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, field: keyof LineItem, value: string) =>
    setLineItems((items) => items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const subtotal = lineItems.reduce((s, li) => {
    return s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0);
  }, 0);
  const taxAmt = subtotal * (parseFloat(taxRate) || 0) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + taxAmt - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const facilityData = serviceType === "BED_BUG_INSPECTION" || serviceType === "BED_BUG_TREATMENT" ? bedBugData
      : serviceType === "GOOSE_CONTROL" ? gooseData
      : serviceType === "BIRD_EXCLUSION" ? birdData
      : (serviceType === "RODENT_INSPECTION" || serviceType === "RODENT_EXCLUSION") ? rodentData
      : null;

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
        facilityData,
        lineItems: lineItems
          .filter((li) => li.description.trim())
          .map((li, idx) => ({
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

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelClass = "block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide";
  const hasModule = !!SERVICE_MODULES[serviceType];

  // Filter service types based on org's enabled modules (null = still loading, show all)
  const visibleServiceTypes = ALL_SERVICE_TYPES.filter((st) => {
    if (!("module" in st) || !st.module) return true;
    if (enabledModules === null) return true;
    return enabledModules.includes(st.module);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Estimate</h1>
        <p className="text-sm text-muted-foreground mt-1">Build a detailed proposal for your client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Property */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Customer *</label>
              <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPropertyId(""); }} required className={inputClass}>
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName ?? `${c.firstName} ${c.lastName}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Property</label>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass} disabled={!customerId}>
                <option value="">Select property…</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Service & Title */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Estimate Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Service Type</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
                {visibleServiceTypes.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estimate Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${visibleServiceTypes.find((s) => s.value === serviceType)?.label ?? "Service"} Proposal`}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Valid Until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Scope of Work / Client-Facing Notes</label>
            <textarea value={scopeNotes} onChange={(e) => setScopeNotes(e.target.value)} rows={3}
              placeholder="Describe the work scope visible to the client…" className={inputClass} />
          </div>
        </div>

        {/* Service Module */}
        {hasModule && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  {SERVICE_MODULES[serviceType]} — Facility Assessment
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in facility details to auto-generate line items</p>
              </div>
              <button type="button" onClick={generateFromModule}
                className="px-4 h-9 rounded-lg text-sm font-semibold text-white shrink-0 bg-primary hover:bg-primary/90 transition-colors">
                Generate Line Items →
              </button>
            </div>

            {(serviceType === "BED_BUG_INSPECTION" || serviceType === "BED_BUG_TREATMENT") && (
              <BedBugModule data={bedBugData} onChange={setBedBugData} />
            )}
            {serviceType === "GOOSE_CONTROL" && (
              <GooseModule data={gooseData} onChange={setGooseData} />
            )}
            {serviceType === "BIRD_EXCLUSION" && (
              <BirdExclusionModule data={birdData} onChange={setBirdData} />
            )}
            {(serviceType === "RODENT_INSPECTION" || serviceType === "RODENT_EXCLUSION") && (
              <RodentModule data={rodentData} onChange={setRodentData} />
            )}
          </div>
        )}

        {/* Line Items */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Line Items</h2>
            {hasModule && (
              <span className="text-xs text-muted-foreground">Use the module above to auto-fill, or add manually</span>
            )}
          </div>

          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_120px_90px_28px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Unit Price</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input type="text" value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    placeholder="Item description" required className={inputClass} />
                </div>
                <div className="w-20">
                  <input type="number" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                    min="0.01" step="any" placeholder="1" required className={`${inputClass} text-center`} />
                </div>
                <div className="w-28">
                  <input type="number" value={li.unitPrice} onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                    min="0" step="0.01" placeholder="0.00" required className={`${inputClass} text-right`} />
                </div>
                <div className="w-24 px-3 py-2 text-sm font-semibold text-right text-foreground tabular-nums">
                  ${((parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0)).toFixed(2)}
                </div>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(i)}
                    className="px-2 py-2 text-muted-foreground hover:text-destructive text-sm shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addLineItem} className="text-sm font-semibold text-primary hover:underline">
            + Add Line Item
          </button>

          {/* Totals */}
          <div className="border-t border-border pt-4 mt-4 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Tax Rate (%)</span>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                min="0" max="100" step="0.01"
                className="w-24 px-2 py-1 rounded border border-border text-right text-sm bg-background" />
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Discount ($)</span>
              <input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                min="0" step="0.01"
                className="w-24 px-2 py-1 rounded border border-border text-right text-sm bg-background" />
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60">
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
