import axios, { get } from "axios";
import { db } from "../db";
import { resumes } from "../models/resume.model";
import {
  claimResumeforAnalysis,
  claimResumeforExtraction,
  claimResumeforSummary,
} from "./resume.service";
import { ApiError } from "../utils/ApiError";
import { PDFParse } from "pdf-parse";
import { eq } from "drizzle-orm";
import { operations } from "../models/operation.model";
import { generateAiAnalysis, generateAISummary } from "./Ai.service";
import { analysis } from "../models/analysis.model";

const startTextExtractor = async () => {
  try {
    while (true) {
      const job = await db.transaction(async (tx) => {
        return await claimResumeforExtraction(tx);
      });

      if (job) {
        console.log(`Extracting resume text: ${job.id}`);
        // Proceed to download from Cloudinary and extract text

        const timeoutController = (timeoutMs: number) => {
          const abortController = new AbortController();
          setTimeout(() => abortController.abort(), timeoutMs || 0);

          return abortController.signal;
        };

        const resumeResponse = await axios({
          method: "get",
          url: job.url,
          responseType: "arraybuffer",
          signal: timeoutController(10000),
        }).catch((error) => {
          if (error.response) {
            console.log(error.response.data, error.response.headers);
            throw new ApiError(error.response.status, "Axios Response Error");
          } else if (error.request) {
            console.log(error.request);
            throw new ApiError(
              500,
              "Axios: The request was made but no response was received",
            );
          } else {
            throw new ApiError(500, error.message);
          }
        });

        if (!resumeResponse) {
          throw new ApiError(500, "Failed to download resume file.");
        }

        if (
          resumeResponse.headers &&
          parseInt(
            (resumeResponse.headers["Content-Length"] || "0").toString(),
          ) > 10485760
        ) {
          throw new ApiError(413, "Resume file is too large.");
        }

        const parse = new PDFParse({ data: resumeResponse.data });
        const parseResult = await parse.getText();
        const rawtext = parseResult.text.trim();
        if (rawtext.length < 100) {
          throw new ApiError(
            422,
            "No extractable text found. Likely a scanned image.",
          );
        }

        const [updatedresume] = await db
          .update(resumes)
          .set({ rawText: rawtext, status: "EXTRACTED" })
          .where(eq(resumes.id, job.id))
          .returning();

        if (!updatedresume) {
          throw new ApiError(
            500,
            "Failed to update resume status to EXTRACTED",
          );
        }

        console.log(
          `Successfully moved resume ${updatedresume.id} to EXTRACTED state.`,
        );
      } else {
        // No jobs found, back off to avoid spamming the DB
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  } catch (error) {
    throw new ApiError(500, "Error: Resume text Extractor Worker");
  }
};

const startResumeSummarizer = async () => {
  let context = null;
  try {
    while (true) {
      const job = await db.transaction(async (tx) => {
        return await claimResumeforSummary(tx);
      });

      if (!job) {
        await new Promise((res) => setTimeout(res, 5000));
        continue;
      }

      const { resume, operation, rawText } = job;
      console.log(`Summarizing Resume: ${resume.id}`);

      const aiResult = await generateAISummary(rawText, operation.profile_snapshot);

      await db.transaction(async (tx) => {
        await tx
          .update(resumes)
          .set({
            parsedData: aiResult.parsedData,
            metadata: aiResult.metadata,
            summary: aiResult.summary,
            status: "SUMMARIZED",
            updatedAt: new Date(),
          })
          .where(eq(resumes.id, job.resume.id));

        await tx
          .update(operations)
          .set({
            status: "COMPLETED",
            completed_at: new Date(),
          })
          .where(eq(operation.id, operations.id));
      });
    }
  } catch (error: any) {
    console.error("Worker Execution Error:", error.message);

    // 4. INLINE ERROR RECOVERY
    // If a context exists, we must "Fail" the records so they aren't stuck
    if (context) {
      console.log(
        `Marking Resume ${context.resume.id} and Operation ${context.operation.id} as FAILED`,
      );

      try {
        await db.transaction(async (tx) => {
          await tx
            .update(resumes)
            .set({ status: "FAILED", updatedAt: new Date() })
            .where(eq(resumes.id, context.resume.id));

          await tx
            .update(operations)
            .set({
              status: "FAILED",
              error: error.message || "Unknown error during summarization",
              completed_at: new Date(),
            })
            .where(eq(operations.id, context.operation.id));
        });
      } catch (dbError) {
        throw new ApiError(500,"CRITICAL: Could not update failure status in DB")
      }
    }
  }
};

const startResumeAnalyzer = async () => {
  while (true) {
    let currentOperationId = null;
    let currentAnalysisId = null;

    try {
      const job = await db.transaction(async (tx) => {
        return await claimResumeforAnalysis(tx); 
        // ^ This naturally throws ApiError(409, "...") if data is missing
      });

      if (!job) {
        await new Promise((res) => setTimeout(res, 5000));
        continue;
      }

      currentOperationId = job.operation_id;
      currentAnalysisId = job.analysis_id;

      const { resume, target } = job;

      // Ensure generateAiAnalysis is updated to throw new ApiError(500, "...") internally
      // if the Gemini API fails, rather than a standard Error.
      const analysisResult = await generateAiAnalysis(resume, target);

      await db.transaction(async (tx) => {
        await tx.update(analysis).set({
          gapAnalysis: analysisResult.gapAnalysis,
          matchScore: analysisResult.matchScore,
          projectIdeas: analysisResult.projectIdeas,
          roadmap: analysisResult.roadmap,
          status: "COMPLETED"
        }).where(eq(analysis.id, currentAnalysisId));

        await tx.update(operations).set({
          status: "COMPLETED"
        }).where(eq(operations.id, currentOperationId));
      });

    } catch (error: any) {
      // 1. Safely extract the custom ApiError properties
      const isApiError = error instanceof ApiError;
      const statusCode = isApiError ? error.statusCode : 500;
      const message = isApiError ? error.message : "Internal Worker Error";
      
      console.error(`[Worker Failed - ${statusCode}]: ${message}`);

      // 2. The Fallback Handler
      if (currentOperationId && currentAnalysisId) {
        try {
          await db.transaction(async (tx) => {
            await tx.update(analysis)
              .set({ status: "FAILED" })
              .where(eq(analysis.id, currentAnalysisId));
            
            await tx.update(operations)
              .set({ status: "FAILED" })
              .where(eq(operations.id, currentOperationId));
          });
        } catch (dbError) {
          // CRITICAL: We do NOT throw an ApiError here. 
          // If the DB is down, throwing will kill the while(true) loop. 
          // We must just log it and wait.
          console.error("Critical DB Failure during fallback:", dbError);
        }
      }

      // 3. Error Backoff
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};


export { startTextExtractor, startResumeSummarizer, startResumeAnalyzer };
