import type {
  Customer,
  CustomerContact,
  Property,
  Building,
  Unit,
  Appointment,
  Inspection,
  InspectionUnit,
  InspectionPhoto,
  Invoice,
  InvoiceLineItem,
  Payment,
  K9Team,
  K9Dog,
  K9TeamMember,
  User,
  Organization,
  Notification,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Customer,
  CustomerContact,
  Property,
  Building,
  Unit,
  Appointment,
  Inspection,
  InspectionUnit,
  InspectionPhoto,
  Invoice,
  InvoiceLineItem,
  Payment,
  K9Team,
  K9Dog,
  K9TeamMember,
  User,
  Organization,
  Notification,
};

// Extended types with relations
export type CustomerWithRelations = Customer & {
  contacts: CustomerContact[];
  properties: Property[];
  _count?: {
    appointments: number;
    invoices: number;
  };
};

export type PropertyWithRelations = Property & {
  customer: Customer;
  buildings: Building[];
  units: Unit[];
  _count?: {
    appointments: number;
    inspections: number;
  };
};

export type AppointmentWithRelations = Appointment & {
  customer: Customer;
  property: Property;
  technician?: User | null;
  k9Team?: K9Team | null;
  inspection?: Inspection | null;
};

export type InspectionWithRelations = Inspection & {
  appointment: Appointment;
  property: Property & { customer: Customer };
  technician: User;
  k9Team?: K9Team | null;
  k9Dog?: K9Dog | null;
  inspectionUnits: (InspectionUnit & { photos: InspectionPhoto[] })[];
  photos: InspectionPhoto[];
  invoice?: Invoice | null;
};

export type InvoiceWithRelations = Invoice & {
  customer: Customer;
  inspection?: (Inspection & { property: Property }) | null;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
};

export type K9TeamWithRelations = K9Team & {
  members: (K9TeamMember & { user: User })[];
  dogs: K9Dog[];
};

// API response types
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ApiError = {
  error: string;
  details?: unknown;
};

// Dashboard statistics
export type DashboardStats = {
  totalInspectionsThisMonth: number;
  positiveDetectionRate: number;
  revenueThisMonth: number;
  unpaidInvoicesTotal: number;
  upcomingAppointmentsCount: number;
  pendingReportsCount: number;
  followUpJobsCount: number;
  recentAppointments: AppointmentWithRelations[];
  recentInvoices: InvoiceWithRelations[];
};

// Form types
export type CreateCustomerInput = {
  customerType: string;
  companyName?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  altPhone?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  notes?: string;
  tags?: string[];
  referralSource?: string;
};

export type CreatePropertyInput = {
  customerId: string;
  name: string;
  propertyType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  totalUnits?: number;
  totalBuildings?: number;
  accessNotes?: string;
  gateCode?: string;
  parkingNotes?: string;
  notes?: string;
};

export type CreateAppointmentInput = {
  customerId: string;
  propertyId: string;
  technicianId?: string;
  k9TeamId?: string;
  serviceType: string;
  scheduledDate: string;
  scheduledEndTime?: string;
  estimatedMinutes?: number;
  title?: string;
  description?: string;
  accessNotes?: string;
  specialInstructions?: string;
  priority?: number;
};

export type CreateInspectionInput = {
  appointmentId: string;
  k9TeamId?: string;
  k9DogId?: string;
  startTime: string;
  weather?: string;
  temperature?: number;
  accessNotes?: string;
  scopeNotes?: string;
};

export type UpsertInspectionUnitInput = {
  unitNumber: string;
  buildingName?: string;
  floor?: string;
  unitType?: string;
  occupant?: string;
  detectionResult: string;
  severityLevel?: string;
  alertLocation?: string;
  visualEvidence?: boolean;
  visualNotes?: string;
  technicianNotes?: string;
  recommendations?: string;
  followUpRequired?: boolean;
  treatmentReferral?: boolean;
  accessGranted?: boolean;
  sortOrder?: number;
};

export type CreateInvoiceInput = {
  customerId: string;
  inspectionId?: string;
  dueDate?: string;
  taxRate?: number;
  discountAmount?: number;
  notes?: string;
  terms?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
};
