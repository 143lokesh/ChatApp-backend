
import express from "express"
import { isAuthenticated } from "../middlewares/auth.js";
import { newGroupChat ,getMyChats, getMyGroups, addMembers, removeMembers ,leaveGroup, sendAttachements, getChatDetails, renameGroup, deleteChat,getMessages} from "../controllers/chatControllers.js";
import { attachementsMulter } from "../middlewares/multer.js";
import { addMembersvalidator, newGroupvalidator, validateHandler ,removeMembersvalidator,leaveGroupvalidator, sendAttachementsvalidator, getMessagesvalidator, chatIdvalidator, renameGroupvalidator } from "../lib/validators.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/newGroup" ,newGroupvalidator(),validateHandler, newGroupChat);


router.get("/myChat" ,getMyChats )
router.get("/myGroups" ,getMyGroups )

router.put("/addMembers" ,addMembersvalidator(),validateHandler, addMembers )
router.put("/removeMember" , removeMembersvalidator(), validateHandler, removeMembers)

router.delete("/leave/:id" ,leaveGroupvalidator(),validateHandler, leaveGroup)

router.post("/message" , attachementsMulter , sendAttachementsvalidator(),validateHandler, sendAttachements )

router.get("/message/:id" ,getMessagesvalidator(),validateHandler, getMessages )

router.route("/:id").get(chatIdvalidator(),validateHandler, getChatDetails).put(renameGroupvalidator(),validateHandler, renameGroup).delete(chatIdvalidator(),validateHandler,deleteChat)


export default router