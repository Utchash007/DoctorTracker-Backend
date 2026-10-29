import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLERK_JWT_KEY: z.string().min(1, 'CLERK_JWT_KEY is required'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment variables:\n${details}`);
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
