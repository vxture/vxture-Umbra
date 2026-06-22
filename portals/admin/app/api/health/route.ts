// Liveness endpoint for the container healthcheck. The handler is shared across
// all portals (see portals/_shared/health.ts via the @shared/* alias); the
// route segment config stays here so Next.js detects it statically.
export { GET } from "@shared/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
