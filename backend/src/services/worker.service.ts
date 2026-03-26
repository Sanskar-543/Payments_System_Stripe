import axios, { get } from "axios";
import { db } from "../db";
import { resumes } from "../models/resume.model";
import { claimNextResume } from "./resume.service";
import { ApiError } from "../utils/ApiError";
import { PDFParse } from "pdf-parse";
import { eq } from "drizzle-orm";

const startTextExtractor = async () => {
  try {
    while (true) {
      const job = await db.transaction(async (tx) => {
        return await claimNextResume(tx);
      });

      if (job) {
        console.log(`Working on resume: ${job.id}`);
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


export {startTextExtractor}