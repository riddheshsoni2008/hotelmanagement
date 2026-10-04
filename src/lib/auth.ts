import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyAuthToken, TokenPayload } from './jwt';

// In-memory rate limiting map for login
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    // 5 attempts allowed in a 60-second window
    loginRateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return { allowed: true };
  }

  if (record.count >= 5) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string) {
  loginRateLimitMap.delete(ip);
}

/**
 * Get current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

/**
 * Check if the user has access to operate on a given hotel
 */
export function hasHotelAccess(user: TokenPayload, hotelId: string): boolean {
  if (user.role === 'owner') {
    return true;
  }
  return user.hotelIds.some((id) => id.toString() === hotelId.toString());
}

/**
 * Filter hotel IDs according to user permissions
 */
export function getAuthorizedHotelFilter(user: TokenPayload, requestedHotelId?: string | null): Record<string, unknown> {
  if (user.role === 'owner') {
    if (requestedHotelId && requestedHotelId !== 'all') {
      return { hotelId: requestedHotelId };
    }
    return {}; // All hotels
  }

  // Staff can only see their assigned hotels
  if (requestedHotelId && requestedHotelId !== 'all') {
    if (!hasHotelAccess(user, requestedHotelId)) {
      throw new Error('Access denied: You do not have permission for this hotel');
    }
    return { hotelId: requestedHotelId };
  }

  return { hotelId: { $in: user.hotelIds } };
}
