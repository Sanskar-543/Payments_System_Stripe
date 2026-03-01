import multer from "multer";
import path from "path";
import fs from "node:fs";
import { ApiError } from "../utils/ApiError";

const TEMP_DIR = "./public/temp";

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      `avatar-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new ApiError(400,"Invalid file type. Only JPG, PNG, WEBP allowed.")
      );
    }

    cb(null, true);
  },
});