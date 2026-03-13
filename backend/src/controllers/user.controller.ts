import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { db } from "../db";
import { uploadonCloudinary } from "../utils/cloudinary";
import { compareString, hashString } from "../utils/bcrypt";
import { users } from "../models/user.model";
import { wallets } from "../models/wallet.model";
import { resumes } from "../models/resume.model";
import { generateAccessToken, generateRefreshToken } from "../utils/Jwt";
import { eq } from "drizzle-orm";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken";
import { careerProfiles } from "../models/careerProfile.model";

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
};

const issueTokens = async (user_id: string, fullname: string) => {
  try {
    const refreshToken = generateRefreshToken(user_id, fullname);
    const accessToken = generateAccessToken(user_id);
    const hashedrefreshToken = await hashString(refreshToken);

    const updateduser = await db
      .update(users)
      .set({
        refreshToken: hashedrefreshToken,
      })
      .where(eq(users.id, user_id))
      .returning();

    if (!updateduser) {
      throw new ApiError(500, "refreshToken not updated on DB");
    }
    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(500, "Error While issueing Tokens");
  }
};

const signUpUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, username, fullName, password } = req.body;

      const fields = { email, username, password, fullName };

      const hasInvalidField = Object.values(fields).some(
        (field) => typeof field !== "string" || field.trim().length === 0,
      );

      if (hasInvalidField) {
        throw new ApiError(400, "All fields are required");
      }

      const avatarlocalpath = req.file?.path;
      const cloudAvatar = await uploadonCloudinary(avatarlocalpath);
      if (!cloudAvatar) {
        throw new ApiError(500, "Cloudinary : Upload Failed");
      }

      const email_on_DB = email.trim().toLowerCase();
      const password_on_DB = await hashString(password);
      const fullName_on_DB = fullName.trim();
      const username_on_DB = username.trim();

      const createdUser = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(users)
          .values({
            email: email_on_DB,
            username: username_on_DB,
            fullName: fullName_on_DB,
            passwordHash: password_on_DB,
            refreshToken: "",
          })
          .returning();

        const user = inserted[0];

        await tx.insert(wallets).values({
          user_id: user.id,
          cachedBalance: 0n,
        });

        return user;
      });

      const { accessToken, refreshToken } = await issueTokens(
        createdUser.id,
        createdUser.fullName,
      );

      const userDetails = {
        id: createdUser.id,
        username: createdUser.username,
        fullName: createdUser.fullName,
        email: createdUser.email,
        createdAt: createdUser.createdAt,
        usernameLastChangedAt: createdUser.usernameLastChangedAt,
      };

      return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, userDetails, "SignUp Successfull"));
    } catch (error: any) {
      if (error?.code === "23505") {
        if (error?.constraint === "users_email_unique") {
          throw new ApiError(409, "Email already exists");
        }

        if (error?.constraint === "users_username_unique") {
          throw new ApiError(409, "Username already exists");
        }
      }

      throw new ApiError(500, "Signup failed");
    }
  },
);

const loginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const fields = { email, password };

      const hasInvalidField = Object.values(fields).some(
        (field) => typeof field !== "string" || field.trim().length === 0,
      );

      if (hasInvalidField) {
        throw new ApiError(400, "Email and password are required");
      }

      const normalizedEmail = email.trim().toLowerCase();

      const result = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          fullname: users.fullName,
          password: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail));

      if (result.length === 0) {
        throw new ApiError(401, "Invalid credentials");
      }

      const user = result[0];

      const isPasswordValid = await compareString(password, user.password);

      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
      }

      const { accessToken, refreshToken } = await issueTokens(
        user.id,
        user.fullname,
      );

      const safeUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        fullname: user.fullname,
      };

      return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user: safeUser }, "Login successful"));
    } catch (error) {
      throw new ApiError(500, "Error while logging in");
    }
  },
);

const logoutUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(200)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, {}, "Logged out"));
    }

    await db
      .update(users)
      .set({ refreshToken: null })
      .where(eq(users.id, userId));

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, {}, "Logout successful"));
  },
);

const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const incomingrefreshToken =
        (await req.cookies?.refreshToken) || req.body?.refreshToken;

      if (!incomingrefreshToken) {
        throw new ApiError(404, "Refresh Token not Found");
      }

      const decodedToken = jwt.verify(
        incomingrefreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );

      const user_id = decodedToken?.id;
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          fullname: users.fullName,
          refreshToken: users.refreshToken,
        })
        .from(users)
        .where(eq(users.id, user_id));

      if (result.length === 0) {
        throw new ApiError(401, "Invalid credentials");
      }
      const user = result[0];
      const isRefreshTokenCorrect = await compareString(
        decodedToken,
        user.refreshToken,
      );

      if (!isRefreshTokenCorrect) {
        throw new ApiError(401, "Invalid Session");
      }

      const { refreshToken, accessToken } = await issueTokens(
        user.id,
        user.fullname,
      );

      return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, {}, "Tokens Refreshed successfully"));
    } catch (error) {
      throw new ApiError(500, "Error while refreshing tokens");
    }
  },
);

const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await db
      .select({ password: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    const user = result[0];

    const isValid = await compareString(oldPassword, user.password);

    if (!isValid) {
      throw new ApiError(401, "Invalid password");
    }

    const hashed = await hashString(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: hashed,
        refreshToken: null,
      })
      .where(eq(users.id, userId));

    return res.json(new ApiResponse(200, {}, "Password changed"));
  },
);

const changeUserDetails = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { fullName, username } = req.body;
    const userId = req.user.id;

    const result = await db
      .select({
        usernameLastChangedAt: users.usernameLastChangedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    const user = result[0];

    if (username) {
      const lastUpdate = user.usernameLastChangedAt;

      if (
        lastUpdate &&
        Date.now() - new Date(lastUpdate).getTime() < 30 * 24 * 60 * 60 * 1000
      ) {
        throw new ApiError(400, "Username can only be changed once in 30 days");
      }
    }

    await db
      .update(users)
      .set({
        fullName,
        username,
        usernameLastChangedAt: username ? new Date() : undefined,
      })
      .where(eq(users.id, userId));

    return res.json(new ApiResponse(200, {}, "Profile updated"));
  },
);

const getUserResume = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;

    const resume = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId));

    return res.json(
      new ApiResponse(200, resume[0] ?? null, "Resume fetched successfully"),
    );
  },
);

const getUserWallet = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;

    const result = await db
      .select({
        balance: wallets.cachedBalance,
      })
      .from(wallets)
      .where(eq(wallets.user_id, userId));

    return res.json(
      new ApiResponse(200, result[0], "Wallet fetched Successfully"),
    );
  },
);

const getUserCareerProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;

    const profile = await db
      .select()
      .from(careerProfiles)
      .where(eq(careerProfiles.userId, userId));

    return res.json(
      new ApiResponse(
        200,
        profile[0] ?? null,
        "Career profile fetched Successfully",
      ),
    );
  },
);

export {
  signUpUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  changeUserDetails,
  getUserResume,
  getUserWallet,
  getUserCareerProfile,
};
