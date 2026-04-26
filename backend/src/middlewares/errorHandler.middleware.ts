import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

/**
 * Centralised error-handling middleware.
 * Must be registered AFTER all routes in app.ts.
 *
 * - Formats known `ApiError` instances into a consistent JSON shape.
 * - Catches unknown errors and masks them behind a generic 500.
 * - Logs full stack traces in development only.
 */
export const globalErrorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Default to 500 if this isn't our custom error
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof ApiError ? err.message : "Internal Server Error";
  const errors = err instanceof ApiError ? err.errors : [];

  // Always log full error in non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR ${statusCode}] ${message}`);
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    // Include stack trace only in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
