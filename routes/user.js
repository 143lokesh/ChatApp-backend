import express from "express"
import { getMyProfile, login , logout, newUser,searchUser,sendFriendRequest,acceptFriendRequest,getNotifications,getMyFriends } from "../controllers/userControllers.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { loginValidator, registerValidator, sendRequestvalidator, validateHandler,acceptRequestvalidator } from "../lib/validators.js";

const router = express.Router();

router.post("/login" ,loginValidator() , validateHandler, login);
router.post("/newUser", singleAvatar,registerValidator(),validateHandler, newUser)

router.use(isAuthenticated)

router.get("/me"  , getMyProfile)
router.get("/logout"  , logout)
router.get("/search" , searchUser)
router.put("/sendRequest" ,sendRequestvalidator(),validateHandler, sendFriendRequest)
router.put("/acceptRequest" ,acceptRequestvalidator(),validateHandler, acceptFriendRequest)
router.get("/notifications" , getNotifications)
router.get("/friends" , getMyFriends)

export default router