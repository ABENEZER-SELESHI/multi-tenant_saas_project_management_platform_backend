import { Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { env } from '../config/env';
import { prisma } from '../database/prisma';
import { pingRedis } from '../database/redis';

export class HealthController {
  liveness(_req: Request, res: Response): void {
    sendSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  async readiness(_req: Request, res: Response): Promise<void> {
    let database: 'ok' | 'error' | 'pending' = 'pending';
    let redis: 'ok' | 'error' | 'pending' = 'pending';

    if (env.DATABASE_URL) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        database = 'ok';
      } catch {
        database = 'error';
      }
    }

    if (env.REDIS_URL) {
      redis = (await pingRedis()) ? 'ok' : 'error';
    }

    sendSuccess(res, {
      status: database === 'error' ? 'degraded' : 'ready',
      environment: env.NODE_ENV,
      checks: { database, redis },
    });
  }
}
