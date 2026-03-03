import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * getDatabaseUrl function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function getDatabaseUrl(): string {
  const env = process.env.DATABASE_URL;
  if (!env) {
    return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
  }
  const filePath = env.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return env;
  const resolved = path.join(process.cwd(), filePath);
  return `file:${resolved}`;
}

/**
 * createPrismaClient function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
