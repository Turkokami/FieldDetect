import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";

const appUrl =
  process.env.UPLOADTHING_CALLBACK_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  ...(appUrl ? { config: { callbackUrl: `${appUrl}/api/uploadthing` } } : {}),
});
