import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lightweight liveness endpoint for the container healthcheck. No dependencies
// so it stays green as long as the Next.js server is serving requests.
export function GET() {
  return NextResponse.json({ status: "ok" });
}
