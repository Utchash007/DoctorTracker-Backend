import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

const app = express();

app.disable('x-powered-by');
if (env.isProduction) {
  // Render/Railway terminate TLS in front of the app, so req.ip must come
  // from the first X-Forwarded-For hop rather than the proxy's address.
  app.set('trust proxy', 1);
}
app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRateLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
