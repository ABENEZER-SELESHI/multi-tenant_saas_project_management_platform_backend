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
    req[target] = result.data;
    next();
  };
};
