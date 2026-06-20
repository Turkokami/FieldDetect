import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FieldDetect demo data...");

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "demo-k9-inspections" },
    update: {},
    create: {
      name: "Apex K9 Bed Bug Inspections",
      slug: "demo-k9-inspections",
      phone: "(312) 555-0100",
      email: "dispatch@apexk9.com",
      website: "https://apexk9inspections.com",
      addressLine1: "840 W Fulton Market",
      city: "Chicago",
      state: "IL",
      zip: "60607",
      licenseNumber: "IL-PC-2024-0892",
      settings: { plan: "PROFESSIONAL" },
    },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // ── Users ──────────────────────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { clerkUserId: "seed_owner_001" },
    update: {},
    create: {
      clerkUserId: "seed_owner_001",
      organizationId: org.id,
      role: "OWNER",
      firstName: "Marcus",
      lastName: "Rivera",
      email: "marcus@apexk9.com",
      phone: "(312) 555-0101",
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { clerkUserId: "seed_dispatcher_001" },
    update: {},
    create: {
      clerkUserId: "seed_dispatcher_001",
      organizationId: org.id,
      role: "DISPATCHER",
      firstName: "Sandra",
      lastName: "Chen",
      email: "sandra@apexk9.com",
      phone: "(312) 555-0102",
    },
  });

  const tech1 = await prisma.user.upsert({
    where: { clerkUserId: "seed_tech_001" },
    update: {},
    create: {
      clerkUserId: "seed_tech_001",
      organizationId: org.id,
      role: "TECHNICIAN",
      firstName: "Jake",
      lastName: "Torres",
      email: "jake@apexk9.com",
      phone: "(312) 555-0103",
      certifications: ["NESDCA Certified Handler", "IPCBA Member"],
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { clerkUserId: "seed_tech_002" },
    update: {},
    create: {
      clerkUserId: "seed_tech_002",
      organizationId: org.id,
      role: "TECHNICIAN",
      firstName: "Priya",
      lastName: "Patel",
      email: "priya@apexk9.com",
      phone: "(312) 555-0104",
      certifications: ["NESDCA Certified Handler"],
    },
  });

  console.log(`  ✓ Users: ${owner.firstName}, ${dispatcher.firstName}, ${tech1.firstName}, ${tech2.firstName}`);

  // ── K9 Teams & Dogs ────────────────────────────────────────────────────────
  const team1 = await prisma.k9Team.upsert({
    where: { id: "seed_team_001" },
    update: {},
    create: {
      id: "seed_team_001",
      organizationId: org.id,
      name: "Alpha Team",
      notes: "Primary downtown inspection team",
    },
  });

  const team2 = await prisma.k9Team.upsert({
    where: { id: "seed_team_002" },
    update: {},
    create: {
      id: "seed_team_002",
      organizationId: org.id,
      name: "Bravo Team",
      notes: "North side residential specialist team",
    },
  });

  await prisma.k9TeamMember.upsert({
    where: { k9TeamId_userId: { k9TeamId: team1.id, userId: tech1.id } },
    update: {},
    create: { k9TeamId: team1.id, userId: tech1.id, isPrimary: true },
  });

  await prisma.k9TeamMember.upsert({
    where: { k9TeamId_userId: { k9TeamId: team2.id, userId: tech2.id } },
    update: {},
    create: { k9TeamId: team2.id, userId: tech2.id, isPrimary: true },
  });

  const dog1 = await prisma.k9Dog.upsert({
    where: { id: "seed_dog_001" },
    update: {},
    create: {
      id: "seed_dog_001",
      k9TeamId: team1.id,
      name: "Rex",
      breed: "Belgian Malinois",
      certificationNumber: "NESDCA-2024-0441",
      certifiedUntil: new Date("2025-09-01"),
    },
  });

  const dog2 = await prisma.k9Dog.upsert({
    where: { id: "seed_dog_002" },
    update: {},
    create: {
      id: "seed_dog_002",
      k9TeamId: team2.id,
      name: "Luna",
      breed: "Labrador Retriever",
      certificationNumber: "NESDCA-2024-0512",
      certifiedUntil: new Date("2025-11-15"),
    },
  });

  console.log(`  ✓ K9 Teams: ${team1.name} (${dog1.name}), ${team2.name} (${dog2.name})`);

  // ── Customers ──────────────────────────────────────────────────────────────
  const customer1 = await prisma.customer.upsert({
    where: { id: "seed_cust_001" },
    update: {},
    create: {
      id: "seed_cust_001",
      organizationId: org.id,
      customerType: "PROPERTY_MANAGEMENT",
      companyName: "Lakeview Property Group",
      firstName: "Diana",
      lastName: "Walsh",
      email: "diana@lakeviewpg.com",
      phone: "(312) 555-0200",
      billingAddressLine1: "444 N Michigan Ave",
      billingCity: "Chicago",
      billingState: "IL",
      billingZip: "60611",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "seed_cust_002" },
    update: {},
    create: {
      id: "seed_cust_002",
      organizationId: org.id,
      customerType: "HOTEL",
      companyName: "The Grand Midway Hotel",
      firstName: "Robert",
      lastName: "Kim",
      email: "rkim@grandmidway.com",
      phone: "(312) 555-0300",
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: "seed_cust_003" },
    update: {},
    create: {
      id: "seed_cust_003",
      organizationId: org.id,
      customerType: "RESIDENTIAL",
      firstName: "Angela",
      lastName: "Moretti",
      email: "angela.moretti@gmail.com",
      phone: "(773) 555-0401",
    },
  });

  const customer4 = await prisma.customer.upsert({
    where: { id: "seed_cust_004" },
    update: {},
    create: {
      id: "seed_cust_004",
      organizationId: org.id,
      customerType: "DORMITORY",
      companyName: "Midwest University Housing",
      firstName: "Tom",
      lastName: "Okafor",
      email: "tokafor@midwestuniv.edu",
      phone: "(312) 555-0500",
    },
  });

  console.log(`  ✓ Customers: Lakeview Property Group, Grand Midway Hotel, Moretti (residential), Midwest University`);

  // ── Properties ──────────────────────────────────────────────────────────────
  const property1 = await prisma.property.upsert({
    where: { id: "seed_prop_001" },
    update: {},
    create: {
      id: "seed_prop_001",
      organizationId: org.id,
      customerId: customer1.id,
      name: "Oakwood Apartments",
      propertyType: "APARTMENT_COMPLEX",
      addressLine1: "2100 N Clark St",
      city: "Chicago",
      state: "IL",
      zip: "60614",
      totalUnits: 24,
      totalBuildings: 2,
      gateCode: "#4821",
      accessNotes: "Check in with front desk. Parking in Lot B.",
    },
  });

  const property2 = await prisma.property.upsert({
    where: { id: "seed_prop_002" },
    update: {},
    create: {
      id: "seed_prop_002",
      organizationId: org.id,
      customerId: customer2.id,
      name: "The Grand Midway Hotel",
      propertyType: "HOTEL",
      addressLine1: "1800 S Michigan Ave",
      city: "Chicago",
      state: "IL",
      zip: "60616",
      totalUnits: 80,
      totalBuildings: 1,
      accessNotes: "Report to security desk. Request housekeeping master key.",
    },
  });

  const property3 = await prisma.property.upsert({
    where: { id: "seed_prop_003" },
    update: {},
    create: {
      id: "seed_prop_003",
      organizationId: org.id,
      customerId: customer3.id,
      name: "Moretti Residence",
      propertyType: "SINGLE_FAMILY",
      addressLine1: "3847 N Ashland Ave",
      city: "Chicago",
      state: "IL",
      zip: "60613",
      accessNotes: "Owner will be home. Ring doorbell.",
    },
  });

  const property4 = await prisma.property.upsert({
    where: { id: "seed_prop_004" },
    update: {},
    create: {
      id: "seed_prop_004",
      organizationId: org.id,
      customerId: customer4.id,
      name: "Midwest University — North Hall",
      propertyType: "DORMITORY",
      addressLine1: "500 W Madison St",
      city: "Chicago",
      state: "IL",
      zip: "60661",
      totalUnits: 48,
      totalBuildings: 1,
      accessNotes: "Contact Facilities Director Tom Okafor on arrival. Badge required.",
    },
  });

  console.log(`  ✓ Properties: Oakwood Apts, Grand Midway Hotel, Moretti Residence, Midwest University`);

  // ── Buildings & Units for Oakwood ─────────────────────────────────────────
  const bldgA = await prisma.building.upsert({
    where: { id: "seed_bldg_001" },
    update: {},
    create: {
      id: "seed_bldg_001",
      propertyId: property1.id,
      name: "Building A",
      code: "A",
      floors: 3,
      totalUnits: 12,
    },
  });

  const bldgB = await prisma.building.upsert({
    where: { id: "seed_bldg_002" },
    update: {},
    create: {
      id: "seed_bldg_002",
      propertyId: property1.id,
      name: "Building B",
      code: "B",
      floors: 3,
      totalUnits: 12,
    },
  });

  const oakwoodUnitNums = [
    { num: "A101", floor: "1", bldg: bldgA.id },
    { num: "A102", floor: "1", bldg: bldgA.id },
    { num: "A103", floor: "1", bldg: bldgA.id },
    { num: "A104", floor: "1", bldg: bldgA.id },
    { num: "A201", floor: "2", bldg: bldgA.id },
    { num: "A202", floor: "2", bldg: bldgA.id },
    { num: "A203", floor: "2", bldg: bldgA.id },
    { num: "A204", floor: "2", bldg: bldgA.id },
    { num: "A301", floor: "3", bldg: bldgA.id },
    { num: "A302", floor: "3", bldg: bldgA.id },
    { num: "A303", floor: "3", bldg: bldgA.id },
    { num: "A304", floor: "3", bldg: bldgA.id },
    { num: "B101", floor: "1", bldg: bldgB.id },
    { num: "B102", floor: "1", bldg: bldgB.id },
    { num: "B103", floor: "1", bldg: bldgB.id },
    { num: "B104", floor: "1", bldg: bldgB.id },
    { num: "B201", floor: "2", bldg: bldgB.id },
    { num: "B202", floor: "2", bldg: bldgB.id },
    { num: "B203", floor: "2", bldg: bldgB.id },
    { num: "B204", floor: "2", bldg: bldgB.id },
    { num: "B301", floor: "3", bldg: bldgB.id },
    { num: "B302", floor: "3", bldg: bldgB.id },
    { num: "B303", floor: "3", bldg: bldgB.id },
    { num: "B304", floor: "3", bldg: bldgB.id },
  ];

  for (const u of oakwoodUnitNums) {
    await prisma.unit.upsert({
      where: { id: `seed_unit_oak_${u.num}` },
      update: {},
      create: {
        id: `seed_unit_oak_${u.num}`,
        propertyId: property1.id,
        buildingId: u.bldg,
        unitNumber: u.num,
        floor: u.floor,
        unitType: "APARTMENT",
      },
    });
  }

  // Hotel rooms 101-120
  for (let i = 101; i <= 120; i++) {
    await prisma.unit.upsert({
      where: { id: `seed_unit_hotel_${i}` },
      update: {},
      create: {
        id: `seed_unit_hotel_${i}`,
        propertyId: property2.id,
        unitNumber: `${i}`,
        floor: "1",
        unitType: "HOTEL_ROOM",
      },
    });
  }

  console.log(`  ✓ Units: 24 Oakwood, 20 Hotel`);

  // ── Appointments ───────────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

  // Completed inspection — Oakwood
  const appt1 = await prisma.appointment.upsert({
    where: { id: "seed_appt_001" },
    update: {},
    create: {
      id: "seed_appt_001",
      organizationId: org.id,
      customerId: customer1.id,
      propertyId: property1.id,
      technicianId: tech1.id,
      k9TeamId: team1.id,
      serviceType: "BED_BUG_INSPECTION",
      status: "INSPECTION_COMPLETE",
      scheduledDate: daysAgo(10),
      scheduledEndTime: new Date(daysAgo(10).getTime() + 3 * 3600000),
      title: "Quarterly inspection — Oakwood Apartments",
      confirmedAt: daysAgo(12),
    },
  });

  // Completed inspection — Hotel
  const appt2 = await prisma.appointment.upsert({
    where: { id: "seed_appt_002" },
    update: {},
    create: {
      id: "seed_appt_002",
      organizationId: org.id,
      customerId: customer2.id,
      propertyId: property2.id,
      technicianId: tech2.id,
      k9TeamId: team2.id,
      serviceType: "BED_BUG_INSPECTION",
      status: "INVOICED",
      scheduledDate: daysAgo(5),
      scheduledEndTime: new Date(daysAgo(5).getTime() + 4 * 3600000),
      title: "Hotel — floors 1 inspection",
      confirmedAt: daysAgo(7),
    },
  });

  // Upcoming — confirmed
  const appt3 = await prisma.appointment.upsert({
    where: { id: "seed_appt_003" },
    update: {},
    create: {
      id: "seed_appt_003",
      organizationId: org.id,
      customerId: customer3.id,
      propertyId: property3.id,
      technicianId: tech1.id,
      k9TeamId: team1.id,
      serviceType: "BED_BUG_INSPECTION",
      status: "CONFIRMED",
      scheduledDate: daysAhead(2),
      scheduledEndTime: new Date(daysAhead(2).getTime() + 1.5 * 3600000),
      title: "Residential inspection — Moretti",
      confirmedAt: daysAgo(1),
    },
  });

  // Upcoming — scheduled
  const appt4 = await prisma.appointment.upsert({
    where: { id: "seed_appt_004" },
    update: {},
    create: {
      id: "seed_appt_004",
      organizationId: org.id,
      customerId: customer4.id,
      propertyId: property4.id,
      technicianId: tech2.id,
      k9TeamId: team2.id,
      serviceType: "BED_BUG_INSPECTION",
      status: "SCHEDULED",
      scheduledDate: daysAhead(5),
      scheduledEndTime: new Date(daysAhead(5).getTime() + 5 * 3600000),
      title: "University dorm — full hall sweep",
      specialInstructions: "Coordinate with RA on each floor before entering rooms.",
    },
  });

  console.log(`  ✓ Appointments: 2 completed, 1 confirmed, 1 scheduled`);

  // ── Inspections ────────────────────────────────────────────────────────────
  const insp1 = await prisma.inspection.upsert({
    where: { id: "seed_insp_001" },
    update: {},
    create: {
      id: "seed_insp_001",
      organizationId: org.id,
      appointmentId: appt1.id,
      propertyId: property1.id,
      technicianId: tech1.id,
      k9TeamId: team1.id,
      k9DogId: dog1.id,
      serviceType: "BED_BUG_INSPECTION",
      inspectionNumber: "INS-2024-0041",
      startTime: daysAgo(10),
      endTime: new Date(daysAgo(10).getTime() + 2.5 * 3600000),
      weather: "Clear",
      temperature: 72,
      totalUnitsInspected: 24,
      totalPositive: 2,
      totalNegative: 20,
      totalInconclusive: 1,
      totalInaccessible: 1,
      overallResult: "POSITIVE_K9_ALERT",
      summaryNotes: "K9 Rex alerted in units A202 and B103. Unit A301 was inconclusive — occupant present with strong odors. B204 inaccessible, occupant not home.",
      recommendations: "Recommend targeted heat treatment for A202 and B103. Schedule follow-up for A301 and B204.",
      followUpRequired: true,
      followUpDate: daysAhead(14),
      treatmentReferral: true,
      reportGeneratedAt: daysAgo(10),
    },
  });

  // InspectionUnits for insp1 (Oakwood — sample units)
  const oakwoodResults: Array<{ num: string; result: string; severity: string; notes?: string }> = [
    { num: "A101", result: "NEGATIVE", severity: "NONE" },
    { num: "A102", result: "NEGATIVE", severity: "NONE" },
    { num: "A103", result: "NEGATIVE", severity: "NONE" },
    { num: "A104", result: "NEGATIVE", severity: "NONE" },
    { num: "A201", result: "NEGATIVE", severity: "NONE" },
    { num: "A202", result: "POSITIVE_K9_ALERT", severity: "MODERATE", notes: "Rex alerted near bed frame and sofa. Confirmed visual evidence of cast skins." },
    { num: "A203", result: "NEGATIVE", severity: "NONE" },
    { num: "A204", result: "NEGATIVE", severity: "NONE" },
    { num: "A301", result: "INCONCLUSIVE", severity: "NONE", notes: "Strong food odors present. Rex unable to clear definitively." },
    { num: "A302", result: "NEGATIVE", severity: "NONE" },
    { num: "A303", result: "NEGATIVE", severity: "NONE" },
    { num: "A304", result: "NEGATIVE", severity: "NONE" },
    { num: "B101", result: "NEGATIVE", severity: "NONE" },
    { num: "B102", result: "NEGATIVE", severity: "NONE" },
    { num: "B103", result: "POSITIVE_K9_ALERT", severity: "LOW", notes: "Alert near closet area. No visual evidence found but strong K9 alert." },
    { num: "B104", result: "NEGATIVE", severity: "NONE" },
    { num: "B201", result: "NEGATIVE", severity: "NONE" },
    { num: "B202", result: "NEGATIVE", severity: "NONE" },
    { num: "B203", result: "NEGATIVE", severity: "NONE" },
    { num: "B204", result: "UNABLE_TO_INSPECT", severity: "NONE", notes: "Occupant not home. Return visit required." },
    { num: "B301", result: "NEGATIVE", severity: "NONE" },
    { num: "B302", result: "NEGATIVE", severity: "NONE" },
    { num: "B303", result: "NEGATIVE", severity: "NONE" },
    { num: "B304", result: "NEGATIVE", severity: "NONE" },
  ];

  for (let i = 0; i < oakwoodResults.length; i++) {
    const r = oakwoodResults[i];
    await prisma.inspectionUnit.upsert({
      where: { id: `seed_iu_oak_${r.num}` },
      update: {},
      create: {
        id: `seed_iu_oak_${r.num}`,
        inspectionId: insp1.id,
        unitNumber: r.num,
        unitType: "APARTMENT",
        detectionResult: r.result as never,
        severityLevel: r.severity as never,
        technicianNotes: r.notes ?? null,
        sortOrder: i,
        inspectedAt: new Date(daysAgo(10).getTime() + i * 5 * 60000),
      },
    });
  }

  // Inspection 2 — Hotel
  const insp2 = await prisma.inspection.upsert({
    where: { id: "seed_insp_002" },
    update: {},
    create: {
      id: "seed_insp_002",
      organizationId: org.id,
      appointmentId: appt2.id,
      propertyId: property2.id,
      technicianId: tech2.id,
      k9TeamId: team2.id,
      k9DogId: dog2.id,
      serviceType: "BED_BUG_INSPECTION",
      inspectionNumber: "INS-2024-0042",
      startTime: daysAgo(5),
      endTime: new Date(daysAgo(5).getTime() + 3.5 * 3600000),
      weather: "Overcast",
      temperature: 68,
      totalUnitsInspected: 20,
      totalPositive: 1,
      totalNegative: 18,
      totalInconclusive: 1,
      totalInaccessible: 0,
      overallResult: "POSITIVE_K9_ALERT",
      summaryNotes: "Luna alerted in room 108. Room 115 inconclusive — guest refused entry, manager override pending.",
      recommendations: "Isolate and treat room 108. Follow up on 115 with next available access.",
      followUpRequired: true,
      followUpDate: daysAhead(7),
      reportGeneratedAt: daysAgo(5),
    },
  });

  for (let i = 101; i <= 120; i++) {
    let result = "NEGATIVE";
    let notes: string | null = null;
    if (i === 108) { result = "POSITIVE_K9_ALERT"; notes = "Luna alerted near headboard. No visual evidence found."; }
    if (i === 115) { result = "INCONCLUSIVE"; notes = "Guest refused full access. Partial inspection only."; }

    await prisma.inspectionUnit.upsert({
      where: { id: `seed_iu_hotel_${i}` },
      update: {},
      create: {
        id: `seed_iu_hotel_${i}`,
        inspectionId: insp2.id,
        unitNumber: `${i}`,
        unitType: "HOTEL_ROOM",
        detectionResult: result as never,
        severityLevel: result === "POSITIVE_K9_ALERT" ? "LOW" : "NONE" as never,
        technicianNotes: notes,
        sortOrder: i - 101,
        inspectedAt: new Date(daysAgo(5).getTime() + (i - 101) * 8 * 60000),
      },
    });
  }

  console.log(`  ✓ Inspections: 2 complete with unit results`);

  // ── Invoices ───────────────────────────────────────────────────────────────
  const inv1 = await prisma.invoice.upsert({
    where: { id: "seed_inv_001" },
    update: {},
    create: {
      id: "seed_inv_001",
      organizationId: org.id,
      customerId: customer1.id,
      inspectionId: insp1.id,
      invoiceNumber: "INV-2024-0041",
      status: "PAID",
      issueDate: daysAgo(9),
      dueDate: new Date(daysAgo(9).getTime() + 30 * 86400000),
      subtotal: 850,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 850,
      paidAmount: 850,
      balanceDue: 0,
      sentAt: daysAgo(9),
      paidAt: daysAgo(6),
      notes: "Thank you for your continued business.",
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: "seed_li_001" },
    update: {},
    create: {
      id: "seed_li_001",
      invoiceId: inv1.id,
      description: "K9 Bed Bug Inspection — 24 units, 2 buildings",
      quantity: 24,
      unitPrice: 35,
      total: 840,
      sortOrder: 0,
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: "seed_li_002" },
    update: {},
    create: {
      id: "seed_li_002",
      invoiceId: inv1.id,
      description: "Detailed written report",
      quantity: 1,
      unitPrice: 10,
      total: 10,
      sortOrder: 1,
    },
  });

  await prisma.payment.upsert({
    where: { id: "seed_pay_001" },
    update: {},
    create: {
      id: "seed_pay_001",
      invoiceId: inv1.id,
      amount: 850,
      method: "CHECK",
      status: "COMPLETED",
      referenceNumber: "CHK-4821",
      processedAt: daysAgo(6),
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { id: "seed_inv_002" },
    update: {},
    create: {
      id: "seed_inv_002",
      organizationId: org.id,
      customerId: customer2.id,
      inspectionId: insp2.id,
      invoiceNumber: "INV-2024-0042",
      status: "SENT",
      issueDate: daysAgo(4),
      dueDate: new Date(daysAgo(4).getTime() + 30 * 86400000),
      subtotal: 1200,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 1200,
      paidAmount: 0,
      balanceDue: 1200,
      sentAt: daysAgo(4),
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: "seed_li_003" },
    update: {},
    create: {
      id: "seed_li_003",
      invoiceId: inv2.id,
      description: "K9 Bed Bug Inspection — 20 hotel rooms (Floor 1)",
      quantity: 20,
      unitPrice: 55,
      total: 1100,
      sortOrder: 0,
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: "seed_li_004" },
    update: {},
    create: {
      id: "seed_li_004",
      invoiceId: inv2.id,
      description: "Expedited written report + treatment referral",
      quantity: 1,
      unitPrice: 100,
      total: 100,
      sortOrder: 1,
    },
  });

  console.log(`  ✓ Invoices: INV-2024-0041 (paid $850), INV-2024-0042 (outstanding $1,200)`);

  console.log("\n✅ Demo seed complete!");
  console.log(`   Org:          ${org.name}`);
  console.log(`   Users:        4 (owner, dispatcher, 2 technicians)`);
  console.log(`   K9 Teams:     2 (Alpha w/ Rex, Bravo w/ Luna)`);
  console.log(`   Customers:    4`);
  console.log(`   Properties:   4`);
  console.log(`   Appointments: 4 (2 complete, 1 confirmed, 1 scheduled)`);
  console.log(`   Inspections:  2 (44 unit results total)`);
  console.log(`   Invoices:     2 ($850 paid, $1,200 outstanding)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
