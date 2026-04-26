import { Router } from "express";
import { uploadAvatar } from "../middlewares/multer.middleware";
import {
  changePassword,
  getCurrentUser,
  getUserAnalysis,
  getUserCareerProfile,
  getUserResume,
  getUserWallet,
  loginUser,
  logoutUser,
  refreshAccessToken,
  signUpUser,
  updateUserDetails,
} from "../controllers/user.controller";
import { verifyJWT, verifyResume } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  signUpSchema,
  loginSchema,
  changePasswordSchema,
  updateUserDetailsSchema,
} from "../validators/user.validators";
import { authLimiter } from "../middlewares/rateLimiter.middleware";

const router = Router();

// ── Public (auth) routes ────────────────────────────────────────────
router
  .route("/signup")
  .post(authLimiter, uploadAvatar.single("avatar"), validate(signUpSchema), signUpUser);

router.route("/login").post(authLimiter, validate(loginSchema), loginUser);

router.route("/refreshAccessToken").post(authLimiter, refreshAccessToken);

// ── Protected routes ────────────────────────────────────────────────
router.route("/logout").post(verifyJWT, logoutUser);

router
  .route("/changePassword")
  .post(verifyJWT, validate(changePasswordSchema), changePassword);

router
  .route("/updateUserDetails")
  .post(verifyJWT, validate(updateUserDetailsSchema), updateUserDetails);

router.route("/getUserResume").get(verifyJWT, getUserResume);
router.route("/getUserWallet").get(verifyJWT, getUserWallet);
router.route("/getUserCareerProfile").get(verifyJWT, getUserCareerProfile);
router.route("/getUserAnalysis").get(verifyJWT, verifyResume, getUserAnalysis);
router.route("/getcurrentuser").get(verifyJWT, getCurrentUser);

export default router;