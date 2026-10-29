import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),
  CLERK_JWT_KEY: z.string().trim().min(1, 'CLERK_JWT_KEY is required'),
  CORS_ORIGIN: z.string().trim().default('http://localhost:3000'),
});

function databaseUrlError(value) {
  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    return 'DATABASE_URL must start with mongodb:// or mongodb+srv://';
  }

  const afterScheme = value.replace(/^mongodb(\+srv)?:\/\//, '');
  const slash = afterScheme.indexOf('/');
  const database = slash === -1 ? '' : afterScheme.slice(slash + 1).split('?')[0];
  if (!database) return 'DATABASE_URL must include a database name';
  return null;
}

function clerkKeyError(value) {
  try {
    const key = crypto.createPublicKey(value);
    if (key.asymmetricKeyType !== 'rsa') {
      return 'CLERK_JWT_KEY must be an RSA public key in PEM format';
    }
  } catch {
    return 'CLERK_JWT_KEY must be an RSA public key in PEM format';
  }
  return null;
}

function parseCorsOrigins(value) {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one origin');
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGIN contains an invalid origin: ${origin}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(
        `CORS_ORIGIN must be an exact http(s) origin without a path or trailing slash: ${origin}`
      );
    }
  }

  return origins;
}

/**
 * Parses and validates environment variables. Kept separate from module
 * initialisation so it can be exercised without exiting the process.
 */
export function parseEnv(raw = process.env) {
  const parsed = envSchema.safeParse(raw);
  const issues = [];

  if (!parsed.success) {
    issues.push(
      ...parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`
      )
    );
  } else {
    const dbError = databaseUrlError(parsed.data.DATABASE_URL);
    if (dbError) issues.push(dbError);

    // Allow PEM keys stored as a single line with literal \n escapes.
    const clerkKey = parsed.data.CLERK_JWT_KEY.replace(/\\n/g, '\n');
    const keyError = clerkKeyError(clerkKey);
    if (keyError) issues.push(keyError);

    try {
      parseCorsOrigins(parsed.data.CORS_ORIGIN);
    } catch (error) {
      issues.push(error.message);
    }

    if (issues.length === 0) {
      return Object.freeze({
        ...parsed.data,
        CLERK_JWT_KEY: clerkKey,
        isProduction: parsed.data.NODE_ENV === 'production',
        corsOrigins: Object.freeze(parseCorsOrigins(parsed.data.CORS_ORIGIN)),
      });
    }
  }

  throw new Error(issues.join('\n'));
}

function loadEnv() {
  try {
    return parseEnv(process.env);
  } catch (error) {
    const details = error.message
      .split('\n')
      .map((line) => `  - ${line}`)
      .join('\n');
    console.error(`Invalid environment variables:\n${details}`);
    process.exit(1);
  }
}

export const env = loadEnv();
