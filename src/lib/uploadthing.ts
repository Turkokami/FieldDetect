import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

// awaitServerData: false — don't block the client waiting for the server callback.
// The callback URL is unreliable in Vercel preview/prod; all DB saves happen
// client-side using the ufsUrl that comes back directly from the CDN upload.
export const ourFileRouter = {
  inspectionPhoto: f(
    { image: { maxFileSize: "8MB", maxFileCount: 10 } },
    { awaitServerData: false }
  )
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
      if (!user) throw new Error("User not found");
      return { userId: user.id, organizationId: user.organizationId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, uploadedBy: metadata.userId };
    }),

  profilePhoto: f(
    { image: { maxFileSize: "4MB", maxFileCount: 1 } },
    { awaitServerData: false }
  )
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
      if (!user) throw new Error("User not found");
      return { userId: user.id, organizationId: user.organizationId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  orgLogo: f(
    { image: { maxFileSize: "4MB", maxFileCount: 1 } },
    { awaitServerData: false }
  )
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
      if (!user || !["OWNER", "ADMIN"].includes(user.role)) throw new Error("Unauthorized");
      return { organizationId: user.organizationId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  siteMapPhoto: f(
    { image: { maxFileSize: "16MB", maxFileCount: 1 } },
    { awaitServerData: false }
  )
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
      if (!user) throw new Error("User not found");
      return { userId: user.id, organizationId: user.organizationId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
