import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  sortOrder: z.number().int().default(0),
});

const patchItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.coerce.number().positive().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  sortOrder: z.number().int().optional(),
});

async function recalcTotals(invoiceId: string) {
  const [invoice, items] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId } }),
    prisma.invoiceLineItem.findMany({ where: { invoiceId } }),
  ]);
  if (!invoice) return;

  const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
  const discount = Number(invoice.discountAmount ?? 0);
  const taxRate = Number(invoice.taxRate ?? 0);
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const totalAmount = subtotal + taxAmount - discount;
  const paidAmount = Number(invoice.paidAmount ?? 0);
  const balanceDue = totalAmount - paidAmount;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, totalAmount, balanceDue },
  });
}

async function getOrgUser(userId: string) {
  return prisma.user.findUnique({ where: { clerkUserId: userId } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getOrgUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "Cannot edit a paid invoice" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const validated = itemSchema.parse(body);

    const item = await prisma.invoiceLineItem.create({
      data: {
        invoiceId: id,
        description: validated.description,
        quantity: validated.quantity,
        unitPrice: validated.unitPrice,
        total: validated.quantity * validated.unitPrice,
        sortOrder: validated.sortOrder,
      },
    });

    await recalcTotals(id);

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getOrgUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "Cannot edit a paid invoice" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const validated = patchItemSchema.parse(body);

    const existing = await prisma.invoiceLineItem.findFirst({ where: { id: itemId, invoiceId: id } });
    if (!existing) return NextResponse.json({ error: "Line item not found" }, { status: 404 });

    const qty = validated.quantity ?? Number(existing.quantity);
    const price = validated.unitPrice ?? Number(existing.unitPrice);

    const item = await prisma.invoiceLineItem.update({
      where: { id: itemId },
      data: {
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.quantity !== undefined ? { quantity: validated.quantity } : {}),
        ...(validated.unitPrice !== undefined ? { unitPrice: validated.unitPrice } : {}),
        total: qty * price,
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
      },
    });

    await recalcTotals(id);

    return NextResponse.json({ data: item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getOrgUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "Cannot edit a paid invoice" }, { status: 409 });
  }

  await prisma.invoiceLineItem.delete({ where: { id: itemId, invoiceId: id } });
  await recalcTotals(id);

  return NextResponse.json({ ok: true });
}
