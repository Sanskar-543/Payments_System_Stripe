import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "node:fs";
import { ApiError } from "./ApiError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const safeUnlink = (filepath: string) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch {
    // swallow error
  }
};

const uploadonCloudinary = async (
  localfilepath: string
): Promise<UploadApiResponse | null> => {
  if (!localfilepath) return null;

  try {
    const response = await cloudinary.uploader.upload(
      localfilepath,
      { resource_type: "auto" }
    );

    return response;
  } catch (error: any) {
    throw new ApiError(
      502,
      "Cloudinary upload failed",
      [error?.message]
    );
  } finally {
    safeUnlink(localfilepath);
  }
};

const replaceonCloudinary = async (
  newfile: string,
  oldfileURL: string
): Promise<UploadApiResponse> => {
  try {
    const uploadedfile = await cloudinary.uploader.upload(
      newfile,
      { resource_type: "auto" }
    );

    const oldfilePublicId = oldfileURL
      .split("/upload/")[1]
      .replace(/^v\d+\//, "")
      .replace(/\.[^/.]+$/, "");

    await cloudinary.uploader.destroy(oldfilePublicId);

    return uploadedfile;
  } catch (error: any) {
    throw new ApiError(
      502,
      "Cloudinary replace failed",
      [error?.message]
    );
  } finally {
    safeUnlink(newfile);
  }
};

const deletefromCloudinary = async (oldfileURL: string): Promise<void> => {
  const oldfilePublicId = oldfileURL
      .split("/upload/")[1]
      .replace(/^v\d+\//, "")
      .replace(/\.[^/.]+$/, "");

    await cloudinary.uploader.destroy(oldfilePublicId);
}

export { uploadonCloudinary, replaceonCloudinary, deletefromCloudinary };
