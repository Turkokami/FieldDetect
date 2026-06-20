import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    public_metadata: { organizationId?: string; role?: string };
  };
};

type ClerkOrgEvent = {
  type: string;
  data: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    public_metadata: Record<string, unknown>;
  };
};

type ClerkOrgMembershipEvent = {
  type: string;
  data: {
    id: string;
    organization: { id: string; name: string };
    public_user_data: {
      user_id: string;
      first_name: string | null;
      last_name: string | null;
      image_url: string | null;
      identifier: string;
    };
    role: string;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkUserEvent | ClerkOrgEvent | ClerkOrgMembershipEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent | ClerkOrgEvent | ClerkOrgMembershipEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type } = evt;

  try {
    if (type === "organization.created") {
      const data = (evt as ClerkOrgEvent).data;
      await prisma.organization.upsert({
        where: { clerkOrgId: data.id },
        update: { name: data.name, slug: data.slug },
        create: {
          clerkOrgId: data.id,
          name: data.name,
          slug: data.slug,
        },
      });
    }

    if (type === "organization.updated") {
      const data = (evt as ClerkOrgEvent).data;
      await prisma.organization.updateMany({
        where: { clerkOrgId: data.id },
        data: { name: data.name, slug: data.slug },
      });
    }

    if (type === "organizationMembership.created" || type === "organizationMembership.updated") {
      const data = (evt as ClerkOrgMembershipEvent).data;
      const org = await prisma.organization.findUnique({
        where: { clerkOrgId: data.organization.id },
      });
      if (!org) {
        console.warn(`Org not found for membership event: ${data.organization.id}`);
        return NextResponse.json({ received: true });
      }

      const clerkRole = data.role;
      const role =
        clerkRole === "org:owner" ? "OWNER" :
        clerkRole === "org:admin" ? "ADMIN" :
        clerkRole === "org:dispatcher" ? "DISPATCHER" :
        clerkRole === "org:technician" ? "TECHNICIAN" : "TECHNICIAN";

      const primaryEmail = data.public_user_data.identifier;

      await prisma.user.upsert({
        where: { clerkUserId: data.public_user_data.user_id },
        update: {
          role: role as "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN",
          organizationId: org.id,
        },
        create: {
          clerkUserId: data.public_user_data.user_id,
          organizationId: org.id,
          email: primaryEmail,
          firstName: data.public_user_data.first_name ?? "",
          lastName: data.public_user_data.last_name ?? "",
          avatarUrl: data.public_user_data.image_url,
          role: role as "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN",
        },
      });
    }

    if (type === "user.updated") {
      const data = (evt as ClerkUserEvent).data;
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address;

      await prisma.user.updateMany({
        where: { clerkUserId: data.id },
        data: {
          firstName: data.first_name ?? "",
          lastName: data.last_name ?? "",
          avatarUrl: data.image_url,
          ...(primaryEmail && { email: primaryEmail }),
        },
      });
    }

    if (type === "user.deleted") {
      const data = (evt as ClerkUserEvent).data;
      await prisma.user.updateMany({
        where: { clerkUserId: data.id },
        data: { isActive: false },
      });
    }
  } catch (error) {
    console.error(`[CLERK_WEBHOOK] Error handling ${type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
