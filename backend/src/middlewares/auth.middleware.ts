import { ApiError } from "../utils/ApiError";
import { Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req: Request, _res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  const decoded = jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET as string
  ) as { id: string };

  req.user = { id: decoded.id };

  next();
});