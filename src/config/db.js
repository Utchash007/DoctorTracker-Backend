import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
  log: env.isProduction ? ['error'] : ['warn', 'error'],
});

export async function connectDb() {
  await prisma.$connect();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
