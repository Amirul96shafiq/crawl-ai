import { NextResponse } from "next/server";

/**
 * Returns a consistent JSON success envelope for API handlers.
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Returns a consistent JSON error envelope for API handlers.
 */
export function apiError(
  message: string,
  status = 400,
  options?: {
    code?: string;
    details?: unknown;
  },
) {
  return NextResponse.json(
    {
      error: message,
      ...(options?.code ? { code: options.code } : {}),
      ...(options?.details !== undefined ? { details: options.details } : {}),
    },
    { status },
  );
}
