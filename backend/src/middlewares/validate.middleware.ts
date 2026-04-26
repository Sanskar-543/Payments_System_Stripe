import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Express middleware factory that validates `req.body` against the
 * provided Zod schema. On success the validated (and transformed)
 * data replaces `req.body` so controllers always work with clean input.
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Zod v4 uses `error.issues`, v3 uses `error.errors`
        const issues = error.issues ?? (error as any).errors ?? [];
        const messages = issues.map(
          (e: any) => `${(e.path ?? []).join(".")}: ${e.message}`,
        );
        next(new ApiError(400, "Validation failed", messages));
        return;
      }
      next(error);
    }
  };
