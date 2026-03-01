import { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler =
  (requestHandler: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };

export { asyncHandler };