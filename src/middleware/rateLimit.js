import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

/**
 * Conservative global limit for /api. Admin traffic is low-volume, so this is
 * generous while still stopping token-verification floods.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Health checks and CORS preflights should never consume the API budget.
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many requests, please try again later'));
  },
});
