import { ApiError } from "../utils/ApiError";
import { Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { resumes } from "../models/resume.model";
import { and, eq } from "drizzle-orm";
import { careerProfiles } from "../models/careerProfile.model";

const verifyJWT = asyncHandler(async (req: Request, _res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  const decoded = jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET as string,
  ) as { user_id: string };

  req.user = { id: decoded.user_id };

  next();
});

const verifyResume = asyncHandler(async (req: Request, _res, next) => {
  const user_id = req.user!.id;
  const { resume_id, target_role, target_country, job_description } = req.body;

  if (!user_id || !resume_id) {
    throw new ApiError(400, "User ID and Resume ID are required");
  }

  const result = await db
    .select({
      resume: resumes,
      profile_snapshot: {
        id: careerProfiles.id,
        targetRole: careerProfiles.targetRole,
        experienceYears: careerProfiles.experienceYears,
        skills: careerProfiles.skills,
        interests: careerProfiles.interests,
        preferences: careerProfiles.preferences,
        additionalContext: careerProfiles.additionalContext
      },
    })
    .from(resumes)
    .innerJoin(careerProfiles,eq(resumes.userId,careerProfiles.userId))
    .where(and(eq(resumes.id, resume_id), eq(resumes.userId, user_id)));

    const data = result[0];
  if (!data) {
    throw new ApiError(403, "Not Found");
  }
  const resumeDetails = {
    currentresume: data.resume,
    profile_snapshot: data.profile_snapshot,
    target_role: target_role,
    target_country: target_country,
    job_description: job_description,
  };

  if (resumeDetails.currentresume.status !== "SUMMARIZED") {
    throw new ApiError(
      400,
      "The Resume is Still being Proccessed,Please wait a few seconds",
    );
  }
  req.resumeDetails = resumeDetails;
  next();
});



export {verifyJWT,verifyResume}