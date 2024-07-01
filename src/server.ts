import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { disconnectRedis } from './database/redis';
import { initWebSocket } from './websocket/socket';
import { startScheduledJobs } from './jobs/scheduler';

const app = createApp();
const httpServer = createServer(app);

initWebSocket(httpServer);

const start = async (): Promise<void> => {
  try {
    if (env.DATABASE_URL) {
      await connectDatabase();
    }
    startScheduledJobs();

    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        apiVersion: env.API_VERSION,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, shutting down gracefully`);
  httpServer.close(async () => {
    await disconnectDatabase();
    await disconnectRedis();
    logger.info('Server shut down');
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();
