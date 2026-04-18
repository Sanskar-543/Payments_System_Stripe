import { ApiError } from "../utils/ApiError";
import { db } from "../db";
import { deletefromCloudinary, uploadonCloudinary } from "../utils/cloudinary";
import { resumes, resumetype } from "../models/resume.model";
import { and, eq } from "drizzle-orm";
import { careerProfiles } from "../models/careerProfile.model";
import { operations } from "../models/operation.model";
import { time } from "drizzle-orm/pg-core";
import { hasBalance } from "./wallet.service";
import { analysis } from "../models/analysis.model";
import { creditLedgers } from "../models/creditLedger.model";

const createInitialRecord = async (
  resumeName: string,
  resumelocalpath: string,
  user_id: string,
): Promise<resumetype> => {
  const cloudResume = await uploadonCloudinary(resumelocalpath);
  if (!cloudResume) {
    throw new ApiError(500, "Cloudinary : Upload Failed");
  }
  try {
    const insertedresult = await db
      .insert(resumes)
      .values({
        userId: user_id,
        name: resumeName,
        status: "PROCESSING",
        cloudinaryUrl: cloudResume.url,
        rawText: "",
        parsedData: {},
        metadata: {},
        summary: {},
      })
      .returning();

    const insertedResume = insertedresult[0];

    return insertedResume as resumetype;
  } catch (error) {
    if ((error as any)?.code === "23505") {
      await deletefromCloudinary(cloudResume?.url);
      throw new ApiError(409, "Resume Name Already exixsts");
    }
    throw new ApiError(500, "Error While Creating new Resume entry");
  }
};

const claimResumeforExtraction = async (tx: any) => {
  const [target] = await tx
    .select()
    .from(resumes)
    .where(eq(resumes.status, "PROCESSING"))
    .limit(1)
    .for("update", { skipLocked: true });

  if (!target) return null;

  const [claimed] = await tx
    .update(resumes)
    .set({ status: "EXTRACTING" })
    .where(eq(resumes.id, target.id))
    .returning();

  return claimed;
};

const claimResumeforSummary = async (tx: any) => {
  // 1. The Lock
  const [target] = await tx
    .select()
    .from(resumes)
    .where(eq(resumes.status, "EXTRACTED"))
    .limit(1)
    .for("update", { skipLocked: true });

  if (!target) return null;

  // 2. The Context Fetch (Removed invalid .returning() here)
  const [profile] = await tx
    .select()
    .from(careerProfiles)
    .where(eq(careerProfiles.userId, target.user_id));

  // If the user deleted their profile mid-extraction, safely fail the resume
  if (!profile) {
    await tx
      .update(resumes)
      .set({ status: "FAILED" })
      .where(eq(resumes.id, target.id));
    return null;
  }

  // 3. The Snapshot Assembly
  const profile_snapshot = {
    name: profile.name,
    targetRole: profile.targetRole,
    experienceYears: profile.experienceYears,
    skills: profile.skills,
    interests: profile.interests,
    preferences: profile.preferences,
    additionalContext: profile.additionalContext,
  };

  // 4. The Queue Entry (Added missing .returning() here)
  const [createdOperation] = await tx.insert(operations).values({
    user_id: target.user_id,
    resume_id: target.id,
    career_profile_id: profile.id,
    feature: "SUMMARY",
    cost: BigInt(0), // Explicitly zeroed out since this stage is free
    status: "RESERVED",
    profile_snapshot: profile_snapshot,
    prompt_version: "test",
    model_name: process.env.SUMMARY_MODEL,
  }).returning();

  // 5. The State Mutation
  const [updatedResume] = await tx
    .update(resumes)
    .set({ status: "SUMMARY_PENDING" })
    .where(eq(resumes.id, target.id))
    .returning();

  // 6. The Handoff
  return {
    resume: updatedResume,
    operation: createdOperation,
    rawText: target.rawText, 
  };
};

const createResumeAnalysisOperation = async (user_id:any,resumeDetails: any) => {
  try {
    const {
      resume,
      profile_snapshot,
      target_role,
      target_country,
      job_description,
    } = resumeDetails;
    
    // FIXED 1: Added the 'return' keyword so the controller receives the IDs
    return await db.transaction(async (tx) => {
      const [newAnalysis] = await tx
        .insert(analysis)
        .values({
          user_id: user_id,
          resume_id: resume.id,
          targetRole: target_role,
          targetCountry: target_country,
          jobDescription: job_description,
        })
        .returning();

      const [newOperation] = await tx.insert(operations).values({
        user_id: resume.user_id,
        resume_id: resume.id,
        analysis_id: newAnalysis.id,
        career_profile_id: profile_snapshot.id,
        feature: "ANALYSIS",
        cost: BigInt(process.env.ANALYSIS_COST as string),
        profile_snapshot: profile_snapshot,
        prompt_version: "test",
        model_name: process.env.ANALYSIS_MODEL as string,
      }).returning();

      await tx.insert(creditLedgers).values({
        user_id: user_id,
        operation_id: newOperation.id,
        delta: BigInt(-20) || BigInt(process.env.ANALYSIS_COST as string),
        entryType: "RESERVATION",
        reservationStatus: "PENDING"
      })
      

      return {
        analysis_id: newAnalysis.id,
        resume_id: newOperation.resume_id,
        operation_id: newOperation.id,
      };

    });
  } catch (error) {
    // FIXED 2: Log the actual database error before throwing the generic 500
    console.error("Database Transaction Failed:", error);
    throw new ApiError(500, "Error while queuing the Resume");
  }
};

const claimResumeforAnalysis = async (tx: any) => {
  try {

    const [target] = await tx
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.feature, "ANALYSIS"),
          eq(operations.status, "PENDING")
        )
      )
      .limit(1)
      .for("update", { skipLocked: true });

    if (!target) return null;

    const [resumeData] = await tx
      .select({
        parsed_data: resumes.parsedData,
        meta_data: resumes.metadata,
        summary: resumes.summary,
      })
      .from(resumes)
      .where(eq(resumes.id, target.resume_id));

    if (!resumeData) {
      throw new ApiError(409, "ResumeAnalyzer: Associated resume missing");
    }

    const [analysisData] = await tx
      .select({
        target_role: analysis.targetRole,
        target_country: analysis.targetCountry,
        job_description: analysis.jobDescription,
      })
      .from(analysis)
      .where(eq(analysis.id, target.analysis_id));

    if (!analysisData) {
      throw new ApiError(409, "ResumeAnalyzer: Associated analysis missing");
    }

    await tx
      .update(analysis)
      .set({ status: "PROCESSING" })
      .where(eq(analysis.id, target.analysis_id));

    await tx
      .update(operations)
      .set({ status: "PROCESSING" })
      .where(eq(operations.id, target.id));

    await tx.update(creditLedgers).set({
      reservationStatus: "CONFIRMED"
    }).where(eq(creditLedgers.operation_id, target.id))
   
    const job = {
      resume: resumeData,
      target: {
        job_description: analysisData.job_description,
        target_role: analysisData.target_role,
        target_country: analysisData.target_country,
      },
      
      operation_id: target.id, 
      analysis_id: target.analysis_id
    };

    return job;
    
  } catch (error) {
    throw new ApiError(500,"Analyzer:Unknown Error Occured")
  }
};

export {
  createInitialRecord,
  claimResumeforExtraction,
  claimResumeforSummary,
  createResumeAnalysisOperation,
  claimResumeforAnalysis,
};
