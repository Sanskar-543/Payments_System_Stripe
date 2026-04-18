import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {
  createInitialRecord,
  createResumeAnalysisOperation,
} from "../services/resume.service";

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
};

const uploadResume = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const resumeName = req.body;
      const user_id = req.user?.id;
      if (!resumeName || !user_id) {
        throw new ApiError(400, "Resume Name and user id is required");
      }

      const resumelocalpath = req.file?.path;

      const createdResume = await createInitialRecord(
        resumeName,
        resumelocalpath,
        user_id,
      );

      const resumeDetails = {
        id: createdResume.id,
        name: createdResume.name,
        user_id: createdResume.userId,
      };

      return res
        .status(200)
        .json(
          new ApiResponse(
            202,
            resumeDetails,
            "initial resume details Successfully inserted",
          ),
        );
    } catch (error) {
      throw new ApiError(500, "Error: Upload resume");
    }
  },
);
const analyzeResume = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user_id = req.user?.id;
      const resumeDetails = req.resumeDetails;
      const analysisDetails =
        await createResumeAnalysisOperation(user_id,resumeDetails);

     
      res.status(202).json({
        success: true,
        message: "Analysis queued successfully.",
        data: {
          operation_id: analysisDetails.operation_id,
          analysis_id: analysisDetails.analysis_id,
        },
      });
    } catch (error) {
      
      console.error("AnalyzeResume Controller Error:", error);
      throw new ApiError(500, "Failed to queue analysis operation");
    }
  },
);

export { uploadResume, analyzeResume };
