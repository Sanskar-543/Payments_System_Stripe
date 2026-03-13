import { db } from "../db";
import { resumes } from "../models/resume.model";
import { claimNextResume } from "./resume.service";

const startWorker = async () => {
  while (true) {
    const job = await db.transaction(async (tx) => {
      return await claimNextResume(tx);
    });

    if (job) {
      console.log(`Working on resume: ${job.id}`);
      // Proceed to download from Cloudinary and extract text
      // ...
      
    } else {
      // No jobs found, back off to avoid spamming the DB
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}




