import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const ACCESS_TTL = '15m';
const REFRESH_TTL_SHORT = '7d';
const REFRESH_TTL_LONG = '365d';

export async function register(input: { email: string; password: string; name: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const err = new Error('Email already in use');
    (err as Error & { status: number }).status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({ data: { email: input.email, passwordHash, name: input.name } });
  return issueTokens(user.id, false);
}

export async function login(input: { email: string; password: string; rememberMe?: boolean }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash) {
    const err = new Error('Invalid credentials');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  return issueTokens(user.id, input.rememberMe ?? false);
}

export async function refresh(refreshToken: string) {
  const tokenRecord = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
    const err = new Error('Refresh token invalid or expired');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  // Preserve the rememberMe duration: if the existing token expires more than 30 days out, treat as rememberMe
  const rememberMe = tokenRecord.expiresAt > new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { revoked: true } });
  return issueTokens(tokenRecord.userId, rememberMe);
}

async function issueTokens(userId: string, rememberMe: boolean) {
  const refreshTtl = rememberMe ? REFRESH_TTL_LONG : REFRESH_TTL_SHORT;
  const refreshMs = rememberMe ? 365 * 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
  const accessToken = jwt.sign({ userId }, config.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign({ userId }, config.JWT_REFRESH_SECRET, { expiresIn: refreshTtl });
  const expiresAt = new Date(Date.now() + refreshMs);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt
    }
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken }
  };
}
