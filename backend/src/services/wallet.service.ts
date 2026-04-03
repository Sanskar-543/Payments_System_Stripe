import { eq } from "drizzle-orm"
import { wallets } from "../models/wallet.model"
import { ApiError } from "../utils/ApiError";




const hasBalance = async (tx: any, user_id: any,cost: bigint ) => {
    const result = await tx.select({cachedBalance : wallets.cachedBalance}).where(eq(wallets.user_id,user_id)).limit(1);

    if (result.length === 0) {
        throw new ApiError(439,"Can't fetch Wallet Balance")
    }

    const userBalance = result[0].cachedBalance

    return BigInt(userBalance) >= cost;
}




export {hasBalance}