// Shared liveness handler for every portal's /api/health route.
//
// IMPORTANT: this module is injected into each portal image at build time via
// the `shared_context` build context (mirroring `brand_context`) and resolved
// through the `@shared/*` tsconfig alias (-> ../_shared). Because it lives
// OUTSIDE each portal's app root, it cannot resolve the portal's node_modules,
// so shared modules here MUST be dependency-free (no `next`/`react` imports) --
// only globals and pure TypeScript. That is why this returns a global `Response`
// instead of `NextResponse`. Code that needs `next`/`react` cannot be shared
// this way; it needs a workspace package (see the P1 plan).
//
// No dependencies means it stays green as long as the Next.js server is serving.
export function GET() {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "content-type": "application/json" },
  });
}
