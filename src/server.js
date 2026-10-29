import app from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';

async function start() {
  try {
    await connectDb();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error(`Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
