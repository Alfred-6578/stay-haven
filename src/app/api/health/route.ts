import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Public uptime probe. Also returns DB connectivity so load balancers
 * and monitoring can flip into degraded mode when Prisma can't reach
 * Postgres.
 */
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date(),
      version: "1.0.0",
      database: "connected",
      userCount,
    });
  } catch (error) {
    console.error("[GET /api/health]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date(),
        version: "1.0.0",
        database: "error",
      },
      { status: 503 }
    );
  }
}
