import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

export const ourFileRouter = {
  inspectionPhoto: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
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

  profilePhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
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

  orgLogo: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
      if (!user || !["OWNER", "ADMIN"].includes(user.role)) throw new Error("Unauthorized");
      return { organizationId: user.organizationId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.organization.update({
        where: { id: metadata.organizationId },
        data: { logoUrl: file.ufsUrl },
      });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
