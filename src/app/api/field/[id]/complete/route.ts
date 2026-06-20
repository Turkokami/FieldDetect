import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import { notifyOnStatusChange } from "@/lib/notify";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: appointmentId } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId: user.organizationId },
      include: {
        inspection: {
          include: { inspectionUnits: { select: { detectionResult: true } } },
        },
        customer: true,
      },
    });
    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();

    // Compute overall result from all inspection units
    const units = appointment.inspection?.inspectionUnits ?? [];
    let overallResult: string = "NEGATIVE";
    const hasAlert = units.some(
      (u) => u.detectionResult === "POSITIVE_K9_ALERT" || u.detectionResult === "VISUAL_CONFIRMATION"
    );
    if (hasAlert) {
      overallResult = units.some((u) => u.detectionResult === "POSITIVE_K9_ALERT")
        ? "POSITIVE_K9_ALERT"
        : "VISUAL_CONFIRMATION";
    } else if (units.some((u) => u.detectionResult === "INCONCLUSIVE")) {
      overallResult = "INCONCLUSIVE";
    } else if (units.some((u) => u.detectionResult === "FOLLOW_UP_REQUIRED")) {
      overallResult = "FOLLOW_UP_REQUIRED";
    }

    await prisma.$transaction(async (tx) => {
      // Mark appointment complete
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "INSPECTION_COMPLETE", actualEndTime: now },
      });

      // Stamp inspection end time + overall result
      if (appointment.inspection) {
        await tx.inspection.update({
          where: { id: appointment.inspection.id },
          data: { endTime: now, overallResult: overallResult as "NEGATIVE" },
        });
      }

      // Auto-create draft invoice if none exists
      const existingInvoice = appointment.inspection
        ? await tx.invoice.findUnique({
            where: { inspectionId: appointment.inspection.id },
          })
        : null;

      if (!existingInvoice) {
        const invoice = await tx.invoice.create({
          data: {
            organizationId: user.organizationId,
            customerId: appointment.customerId,
            inspectionId: appointment.inspection?.id,
            invoiceNumber: generateInvoiceNumber(),
            status: "DRAFT",
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // net-30
            subtotal: 0,
            totalAmount: 0,
            balanceDue: 0,
          },
        });

        await tx.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            description: `K9 Inspection Services — ${appointment.inspection?.id ? "see report" : ""}`,
            quantity: 1,
            unitPrice: 0,
            total: 0,
            sortOrder: 0,
          },
        });
      }
    });

    // Fire notification (non-blocking)
    notifyOnStatusChange(appointmentId, "INSPECTION_COMPLETE").catch(() => {});

    return NextResponse.json({ data: { completed: true, overallResult } });
  } catch (error) {
    console.error("[FIELD_COMPLETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
