import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'hotelmgmt_super_secret_jwt_key_production_grade_2026_xyz';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
  hotelIds: string[];
}

export const AUTH_COOKIE_NAME = 'hotel_auth_token';

export async function signAuthToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'owner' | 'staff',
      hotelIds: (payload.hotelIds as string[]) || [],
    };
  } catch {
    return null;
  }
}
