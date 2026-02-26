import { NextResponse } from "next/server";
import { getCallerIdentity } from "@/lib/guest";
import { prisma } from "@/lib/db";

/**
 * Debug endpoint to diagnose empty chat list.
 * GET /api/debug-identity returns caller type, id, and chat count.
 * Remove or protect in production.
 */
export async function GET() {
  const caller = await getCallerIdentity();
  const where =
    caller.type === "user"
      ? { userId: caller.id, archivedAt: null }
      : { guestId: caller.id, archivedAt: null };
  const chatCount = await prisma.chat.count({ where });
  return NextResponse.json({
    callerType: caller.type,
    callerId: caller.id,
    chatCount,
  });
}
