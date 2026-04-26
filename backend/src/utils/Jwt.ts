import jwt, { type SignOptions } from "jsonwebtoken"

export const generateAccessToken = (user_id: string): string => {
    const options: SignOptions = {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY as string as any,
    };
    return jwt.sign(
        {
            user_id: user_id
        },
        process.env.ACCESS_TOKEN_SECRET as string,
        options,
    )
}

export const generateRefreshToken = (user_id: string, name: string): string => {
    const options: SignOptions = {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY as string as any,
    };
    return jwt.sign(
        {
            user_id: user_id,
            name: name
        },
        process.env.REFRESH_TOKEN_SECRET as string,
        options,
    )
}
