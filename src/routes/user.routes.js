import { Router } from "express"
import { changeUserPasswod, getCurrentUser, getUserChannelsProfile, getWatchHistory, logedInUser, logoutUser, regenerateAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
)

router.route("/login").post(logedInUser)

// secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/regenerate-access-token").post(regenerateAccessToken)

router.route("/change-password").post(verifyJWT, changeUserPasswod)

router.route("/details").get(verifyJWT, getCurrentUser)

router.route("/update").post(verifyJWT, updateAccountDetails)

router.route("/update-avatar").post(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/update-cover-image").post(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/channel-profile").post(verifyJWT, getUserChannelsProfile)

router.route("/watch-history").post(verifyJWT, getWatchHistory)

export { router as userRouter }