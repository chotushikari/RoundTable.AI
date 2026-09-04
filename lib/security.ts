import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const CANDIDATE_COOKIE = 'roundtable_candidate';

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signingSecret(): string {
  const configured = process.env.SESSION_SIGNING_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SIGNING_SECRET is required in production');
  }
  return 'roundtable-development-only-signing-secret';
}

function signature(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

export function createCandidateGrant(sessionId: string, expiresAt: string): string {
  const payload = Buffer.from(JSON.stringify({ sessionId, expiresAt })).toString(
    'base64url',
  );
  return `${payload}.${signature(payload)}`;
}

export function verifyCandidateGrant(
  grant: string | undefined | null,
): { sessionId: string; expiresAt: string } | null {
  if (!grant) return null;
  const [payload, provided] = grant.split('.');
  if (!payload || !provided) return null;

  const expected = signature(payload);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sessionId?: string;
      expiresAt?: string;
    };
    if (!parsed.sessionId || !parsed.expiresAt) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return { sessionId: parsed.sessionId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function createMcpGrant(sessionId: string, expiresAt: string): string {
  return createCandidateGrant(`mcp:${sessionId}`, expiresAt);
}

export function verifyMcpGrant(grant: string): string | null {
  const verified = verifyCandidateGrant(grant);
  if (!verified?.sessionId.startsWith('mcp:')) return null;
  return verified.sessionId.slice(4);
}

export function candidateCookieName(): string {
  return CANDIDATE_COOKIE;
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const value = authorization.slice('Bearer '.length).trim();
  return value || null;
}

export function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
