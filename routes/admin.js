import express from "express"
import { allChats, allMessages,adminLogin,adminLogOut, allUsers,getDashBoardStats, getAdminData } from "../controllers/adminControllers.js";
import { adminLoginvalidator, validateHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const router = express.Router();


router.post("/verify",adminLoginvalidator(),validateHandler, adminLogin)
router.get("/logout",adminLogOut)


router.use(adminOnly)
router.get("/",getAdminData)

router.get("/users" , allUsers)
router.get("/chats",allChats)
router.get("/messages",allMessages)
router.get("/stats",getDashBoardStats)


export default router