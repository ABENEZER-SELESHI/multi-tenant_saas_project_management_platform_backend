import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/apiResponse';

type RequestTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: RequestTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      sendError(res, 'Validation failed', 422, errors);
      return;
    }

    if (target === 'body') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- validated by Zod
      req.body = result.data;
    } else if (target === 'query') {
      Object.assign(req.query, result.data);
    } else {
      Object.assign(req.params, result.data);
    }

    next();
  };
};
