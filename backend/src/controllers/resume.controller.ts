import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { createInitialRecord } from "../services/resume.service";

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
            200,
            resumeDetails,
            "resume details Successfully inserted",
          ),
        );
    } catch (error) {
      throw new ApiError(500, "Error: Upload resume");
    }
  },
);
export { uploadResume };
