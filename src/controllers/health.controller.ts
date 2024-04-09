import { Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { env } from '../config/env';

export class HealthController {
  liveness(_req: Request, res: Response): void {
    sendSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  readiness(_req: Request, res: Response): void {
    // Database and Redis checks will be added when services are connected
    sendSuccess(res, {
      status: 'ready',
      environment: env.NODE_ENV,
      checks: {
        database: 'pending',
        redis: 'pending',
      },
    });
  }
}
