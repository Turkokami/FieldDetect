import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that skip Clerk sign-in. Each one is either meant to be public or does
// its own auth (token in the URL, API key, CRON_SECRET or webhook signature).
// Patterns match whole path segments: "/e/(.*)", not "/e(.*)", which would also
// match "/estimates".
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing",
  "/privacy",
  "/terms",
  "/api/webhooks/(.*)",      // Clerk / Stripe, verified by signature
  "/api/public/(.*)",        // booking, org info, token-scoped invoice/review/estimate
  "/api/integrations/(.*)",  // authenticated by API key inside the route
  "/api/cron/(.*)",          // each cron route checks CRON_SECRET
  "/book/(.*)",
  "/pay/(.*)",
  "/review/(.*)",
  "/e/(.*)",                 // public estimate pages
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
