import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/acceptable-use",
  "/security",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/extensions(.*)",
  "/api/payments/webhook",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  "/sitemap.xml",
  "/robots.txt",
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
