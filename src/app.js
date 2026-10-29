import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

app.disable('x-powered-by');
if (env.isProduction) {
  // Render/Railway terminate TLS in front of the app, so req.ip must come
  // from the first X-Forwarded-For hop rather than the proxy's address.
  app.set('trust proxy', 1);
}

// Only flat query strings: no nested objects from `qs`, so nothing can smuggle
// operators or prototype keys into Prisma filters.
app.set('query parser', 'simple');

app.use(helmet());

const allowedOrigins = new Set(env.corsOrigins);
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin, curl and server-to-server calls arrive without an Origin.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(ApiError.forbidden('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRateLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
