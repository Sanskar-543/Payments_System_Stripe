import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { db } from "../db";
import { wallets } from "../models/wallet.model";
import { eq } from "drizzle-orm";

export const requireCredits = (requiredCredits: bigint) =>
  asyncHandler(async (req, _res, next) => {
    const userId = req.user.id;

    const result = await db
      .select({
        balance: wallets.cachedBalance
      })
      .from(wallets)
      .where(eq(wallets.user_id, userId));

    const walletData = result[0];

    if (!walletData) {
      throw new ApiError(404, "Wallet not found");
    }

    if (walletData.balance < requiredCredits) {
      throw new ApiError(402, "Insufficient credits");
    }

    next();
  });