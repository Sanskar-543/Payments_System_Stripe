import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const verifyOwnership = (paramKey: string) =>
  asyncHandler(async (req, _res, next) => {
    const userId = req.user?.id;
    const resourceUserId = req.params[paramKey];

    if (!userId || userId !== resourceUserId) {
      throw new ApiError(403, "Forbidden resource access");
    }

    next();
  });