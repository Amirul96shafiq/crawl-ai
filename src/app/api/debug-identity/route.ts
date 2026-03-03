import { NextResponse } from "next/server";
import { getCallerIdentity } from "@/lib/guest";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api-response";

/**
 * Returns runtime caller identity details for local debugging only.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return apiError("Not found", 404);
  }

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
