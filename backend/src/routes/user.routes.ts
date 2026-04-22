import { Router } from "express";
import { uploadAvatar } from "../middlewares/multer.middleware";
import { changePassword, getCurrentUser, getUserAnalysis, getUserCareerProfile, getUserResume, getUserWallet, loginUser, logoutUser, refreshAccessToken, signUpUser, updateUserDetails } from "../controllers/user.controller";
import { verifyJWT, verifyResume } from "../middlewares/auth.middleware";

const router = Router();






router.route("/signup").post(
    uploadAvatar.single("avatar"),signUpUser
)

router.route("/login").post(loginUser);
router.route("/refreshAccessToken").post(refreshAccessToken);
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/changePassword").post(verifyJWT, changePassword);
router.route("/updateUserDetails").post(verifyJWT,updateUserDetails);
router.route("/getUserResume").get(verifyJWT,getUserResume);
router.route("/getUserWallet").get(verifyJWT,getUserWallet);
router.route("/getUserCareerProfile").get(verifyJWT,getUserCareerProfile);
router.route("/getUserAnalysis").get(verifyJWT,verifyResume,getUserAnalysis);
router.route("getcurrentuser").get(verifyJWT,getCurrentUser);