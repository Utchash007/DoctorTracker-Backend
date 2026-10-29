import { verifyToken } from '@clerk/backend';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function bearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

/**
 * Verifies the Bearer Clerk session token against CLERK_JWT_KEY and attaches
 * `{ userId, claims }` to req.auth. Every protected router sits below this.
 */
export async function authenticate(req, _res, next) {
  const token = bearerToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const claims = await verifyToken(token, { jwtKey: env.CLERK_JWT_KEY });
    req.auth = { userId: claims.sub, claims };
    return next();
  } catch {
    // Never log the token or verifier internals.
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/**
 * Allows only callers whose Clerk public metadata role matches one of `roles`.
 * Must run after `authenticate`.
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }

    const role = req.auth.claims?.publicMetadata?.role;
    if (typeof role !== 'string' || !roles.includes(role)) {
      return next(ApiError.forbidden());
    }

    return next();
  };
}
