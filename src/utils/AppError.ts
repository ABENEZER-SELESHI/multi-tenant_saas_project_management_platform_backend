import { FieldError } from './apiResponse';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: FieldError[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 400,
    errors?: FieldError[],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
