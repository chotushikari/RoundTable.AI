import { NextResponse } from 'next/server';

export function apiError(error: unknown, fallback = 'Request failed'): NextResponse {
  const message = error instanceof Error ? error.message : fallback;
  const status = /authentication|required|invalid company session/i.test(message)
    ? 401
    : /not found/i.test(message)
      ? 404
      : /already|expired|revoked|conflict|changed/i.test(message)
        ? 409
        : /required|invalid|must|maximum|only/i.test(message)
          ? 400
          : 500;
  if (status >= 500) console.error('[api]', error);
  return NextResponse.json({ error: status >= 500 ? fallback : message }, { status });
}
