import app from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';

async function start() {
  try {
    await connectDb();
    console.log('Connected to MongoDB');
  } catch (error) {
    // Prisma errors can include the connection string; log only the class.
    console.error(`Failed to connect to MongoDB (${error?.name ?? 'Error'}). Check DATABASE_URL and network access.`);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`${signal} received — shutting down`);

    // Give in-flight requests a short grace period, then force-close.
    const forceExit = setTimeout(() => {
      console.error('Shutdown timed out — forcing exit');
      server.closeAllConnections?.();
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      clearTimeout(forceExit);
      try {
        await disconnectDb();
      } catch (error) {
        console.error(`Failed to disconnect from MongoDB (${error?.name ?? 'Error'})`);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
