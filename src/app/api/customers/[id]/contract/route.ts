import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { ContractPDF } from "@/components/contracts/contract-pdf";

const bodySchema = z.object({
  serviceAddress: z.string().min(1),
  serviceType: z.string().min(1),
  pricePerService: z.number().min(0),
  numServices: z.number().int().min(1),
  totalPrice: z.number().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!customer) return new NextResponse("Not found", { status: 404 });

    const body = await req.json();
    const { serviceAddress, serviceType, pricePerService, numServices, totalPrice } =
      bodySchema.parse(body);

    const org = user.organization;
    const date = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const element = React.createElement(ContractPDF, {
      org: {
        name: org.name,
        addressLine1: org.addressLine1 ?? null,
        city: org.city ?? null,
        state: org.state ?? null,
        zip: org.zip ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
        licenseNumber: org.licenseNumber ?? null,
        contractTemplate: (org as { contractTemplate?: string | null }).contractTemplate ?? null,
      },
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        companyName: customer.companyName ?? null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
      },
      serviceAddress,
      serviceType,
      pricePerService,
      numServices,
      totalPrice,
      date,
    });

    const pdfStream = await pdf(element as React.ReactElement<DocumentProps>).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const filename = `service-agreement-${customer.firstName.toLowerCase()}-${customer.lastName.toLowerCase()}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[CONTRACT_PDF]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
