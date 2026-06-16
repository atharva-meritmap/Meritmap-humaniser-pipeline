import { NextResponse } from 'next/server';

export function successResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status: number = 500, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

/**
 * Handle unknown errors consistently across all API routes.
 * Replaces `catch (err: any) { err.message }` pattern.
 * When `sanitize` is true, internal error details are hidden in production.
 */
export function handleApiError(err: unknown, sanitize?: boolean): NextResponse {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  return NextResponse.json({ success: false, error: (!sanitize || process.env.NODE_ENV === 'development') ? message : 'Internal error' }, { status: 500 });
}
