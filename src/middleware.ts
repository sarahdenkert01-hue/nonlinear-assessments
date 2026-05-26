import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Client intake — no login required. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/intake(.*)",
  ...(process.env.NODE_ENV === "development" ? ["/dev(.*)"] : []),
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  if (isPublicRoute(req)) return;

  // Client save/submit by intake token (no clinician auth)
  if (pathname.match(/^\/api\/intake\/[^/]+/)) return;

  // Dev-only preview APIs (no clinician auth in local dev)
  if (
    process.env.NODE_ENV === "development" &&
    pathname.startsWith("/api/dev/")
  ) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
