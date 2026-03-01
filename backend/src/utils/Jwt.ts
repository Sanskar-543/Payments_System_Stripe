import jwt from "jsonwebtoken"

export const generateAccessToken = (user_id: string): string => {
    return jwt.sign(
        {
            user_id: user_id
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }

    )
}

export const generateRefreshToken = (user_id: string, name: string): string => {
    return jwt.sign(
        {
            user_id: user_id,
            name: name
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

