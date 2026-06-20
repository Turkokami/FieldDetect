import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0),
  sortOrder: z.number().int().optional(),
});

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  inspectionId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const where: Record<string, unknown> = { organizationId: user.organizationId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          inspection: {
            select: { id: true, inspectionNumber: true, startTime: true },
          },
          lineItems: true,
          payments: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[INVOICES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const validated = createInvoiceSchema.parse(body);

    const subtotal = validated.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = (subtotal - validated.discountAmount) * (validated.taxRate / 100);
    const totalAmount = subtotal - validated.discountAmount + taxAmount;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: user.organizationId,
          customerId: validated.customerId,
          inspectionId: validated.inspectionId,
          invoiceNumber: generateInvoiceNumber(),
          dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
          taxRate: validated.taxRate,
          taxAmount,
          discountAmount: validated.discountAmount,
          subtotal,
          totalAmount,
          balanceDue: totalAmount,
          notes: validated.notes,
          terms: validated.terms,
          lineItems: {
            create: validated.lineItems.map((item, idx) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
              sortOrder: item.sortOrder ?? idx,
            })),
          },
        },
        include: {
          customer: true,
          lineItems: true,
          payments: true,
        },
      });

      if (validated.inspectionId) {
        await tx.appointment.updateMany({
          where: { inspection: { id: validated.inspectionId } },
          data: { status: "INVOICED" },
        });
      }

      return inv;
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INVOICES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
