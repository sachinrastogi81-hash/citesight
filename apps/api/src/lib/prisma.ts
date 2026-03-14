import { PrismaClient } from '@prisma/client';

const base = process.env.DATABASE_URL ?? '';
const sep = base.includes('?') ? '&' : '?';

export const prisma = new PrismaClient({
  datasources: {
    db: { url: `${base}${sep}connection_limit=10&pool_timeout=10` },
  },
});
