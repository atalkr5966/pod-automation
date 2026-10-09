import crypto from 'crypto';
import { dbService } from '@/server/db';
import { User, SafeUser } from '@/types';

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  'pod_enterprise_royal_saas_sec_auth_key_2026_xyz';

// Password Security (PBKDF2 with SHA-512, 100,000 iterations)
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash), Buffer.from(hash));
}

// In-Memory Rate Limiter for Login Attempts
const loginAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

export function checkRateLimit(ipOrKey: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const entry = loginAttemptsMap.get(ipOrKey);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    const waitSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  if (now > entry.lockedUntil) {
    loginAttemptsMap.delete(ipOrKey);
  }

  return { allowed: true };
}

export function recordFailedAttempt(ipOrKey: string) {
  const now = Date.now();
  const entry = loginAttemptsMap.get(ipOrKey) || { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= 5) {
    // Lock for 15 minutes
    entry.lockedUntil = now + 15 * 60 * 1000;
  }

  loginAttemptsMap.set(ipOrKey, entry);
}

export function resetRateLimit(ipOrKey: string) {
  loginAttemptsMap.delete(ipOrKey);
}

// JWT Token Helpers
function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export function signToken(payload: Record<string, unknown>, expiresInSec: number = 7 * 86400): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;
  const fullPayload = { ...payload, iat, exp };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, 'utf-8'),
        Buffer.from(expectedSignature, 'utf-8')
      )
    ) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    workspaceId: user.workspaceId,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Extracts and validates bearer token or cookie from incoming Request.
 */
export async function getSessionUser(request: Request): Promise<SafeUser | null> {
  let token: string | null = null;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Also check cookie if header is not present
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/pod_session=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) return null;

  const verified = verifyToken(token);
  if (!verified || !verified.userId) {
    return null;
  }

  const user = await dbService.findUserById(String(verified.userId));
  if (!user) return null;

  return toSafeUser(user);
}
