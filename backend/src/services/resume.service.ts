import { ApiError } from "../utils/ApiError";
import { db } from "../db";
import { deletefromCloudinary, uploadonCloudinary } from "../utils/cloudinary";
import { resumes, resumetype } from "../models/resume.model";
import { eq } from "drizzle-orm";


const createInitialRecord = async (
  resumeName: string,
  resumelocalpath: string,
  user_id: string,
): Promise<resumetype> => {
  // TODO: Implement actual logic to create and return a Resumetype record
  const cloudResume = await uploadonCloudinary(resumelocalpath);
  if (!cloudResume) {
      throw new ApiError(500, "Cloudinary : Upload Failed");
    }
    try {
    const insertedresult = await db.insert(resumes).values({
      userId: user_id,
      name: resumeName,
      status: "PROCESSING",
      cloudinaryUrl: cloudResume.url,
      rawText: "",
      parsedData: {},
      metadata: {},
      summary: {},
    }).returning();
  
    const insertedResume = insertedresult[0];
  
  
    return insertedResume as resumetype;
  } catch (error) {
    if(error?.code === "23505"){
        await deletefromCloudinary(cloudResume?.url);
        throw new ApiError(409,"Resume Name Already exixsts")
    }
    throw new ApiError(500,"Error While Creating new Resume entry")
  }
};

const claimNextResume = async (tx: any) => {
  const [target] = await tx
    .select()
    .from(resumes)
    .where(eq(resumes.status, "PROCESSING"))
    .limit(1)
    .for("update", { skipLocked: true });

  if (!target) return null;

  const [claimed] = await tx
    .select()
    .from(resumes)
    .set({ status: "EXTRACTING" })
    .where(eq(resumes.id, target.id))
    .returning();

  return claimed;
};

export { createInitialRecord, claimNextResume };
