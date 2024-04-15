import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './AppError';

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
}

export const signAccessToken = (userId: string): string => {
  if (!env.JWT_ACCESS_SECRET) {
    throw new AppError('JWT access secret not configured', 500);
  }
  return jwt.sign(
    { sub: userId, type: 'access' } satisfies AccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
};

export const signRefreshToken = (userId: string, tokenId: string): string => {
  if (!env.JWT_REFRESH_SECRET) {
    throw new AppError('JWT refresh secret not configured', 500);
  }
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: tokenId } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  if (!env.JWT_ACCESS_SECRET) {
    throw new AppError('JWT access secret not configured', 500);
  }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access') throw new AppError('Invalid token type', 401);
    return payload;
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  if (!env.JWT_REFRESH_SECRET) {
    throw new AppError('JWT refresh secret not configured', 500);
  }
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (payload.type !== 'refresh') throw new AppError('Invalid token type', 401);
    return payload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

export const getAccessTokenExpirySeconds = (): number => {
  const match = env.JWT_ACCESS_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
};
