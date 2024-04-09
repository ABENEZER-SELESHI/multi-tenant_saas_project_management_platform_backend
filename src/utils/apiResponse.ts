import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = '',
  statusCode = 200,
  meta?: PaginationMeta,
): void => {
  const body: ApiSuccessResponse<T> = { success: true, message, data };
  if (meta) {
    body.meta = meta;
  }
  res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: FieldError[],
): void => {
  const body: ApiErrorResponse = { success: false, message };
  if (errors?.length) {
    body.errors = errors;
  }
  res.status(statusCode).json(body);
};
