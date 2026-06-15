import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JWTPayload {
  sub: string; // stable user login (used for cross-mode lookup)
  role: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'gqbox-dev-secret-change-in-production';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function base64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function signToken(payload: Pick<JWTPayload, 'sub' | 'role'>): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadPart = base64urlEncode(JSON.stringify(fullPayload));
  const signingInput = `${header}.${payloadPart}`;
  const signature = sign(signingInput, JWT_SECRET);
  return `${signingInput}.${signature}`;
}

export function verifyToken(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;
  const expectedSignature = sign(signingInput, JWT_SECRET);

  // timing-safe comparison to prevent timing attacks
  const actual = Buffer.from(signature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid token signature');
  }

  let decoded: JWTPayload;
  try {
    decoded = JSON.parse(base64urlDecode(payload)) as JWTPayload;
  } catch {
    throw new Error('Invalid token payload');
  }

  if (typeof decoded.exp !== 'number') {
    throw new Error('Token has no expiration');
  }

  if (Math.floor(Date.now() / 1000) >= decoded.exp) {
    throw new Error('Token expired');
  }

  return decoded;
}
