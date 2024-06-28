
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler=(req,res,next)=>{
    const errors= validationResult(req);

    const ErrorMessages = errors.array().map((error)=>error.msg).join(",")
    
    if(errors.isEmpty()){
        return next()
    }
    else{
        next(new ErrorHandler(ErrorMessages , 404))
    }

}
const validateObjectId = (value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ObjectId');
    }
    return true;
  };

const registerValidator =()=>[
    body("name" , "please enter Name").notEmpty(),
    body("username" , "please enter User Name").notEmpty(),
    body("password" , "please enter password").notEmpty(),
    body("bio" , "please enter bio").notEmpty(),
 
]

const loginValidator =()=>[
  
    body("username" , "please enter User Name").notEmpty(),
    body("password" , "please enter password").notEmpty(),
]




const newGroupvalidator = ()=>[
    body("name" , "please enter  Name").notEmpty(),
    body("members").notEmpty().withMessage("Please enter members").isArray({min:2 , max:100}).withMessage("Members must be 2-100")
]

const addMembersvalidator = ()=>[
    body("chatId" , "please enter  chatId").notEmpty(),
    body("members").notEmpty().withMessage("Please enter members").isArray({min:1 , max:97}).withMessage("Members must be 1-97"),
]
const removeMembersvalidator = ()=>[
    body("chatId" , "please enter  chatId").notEmpty(),
    body("userId" , "please enter  userId").notEmpty(),
    
]

const leaveGroupvalidator = ()=>[
    param('id').notEmpty().withMessage("Please send params id").custom(validateObjectId).withMessage('Invalid chat ID'),
]

const sendAttachementsvalidator = ()=>[
    body("chatId" , "please enter  chatId").notEmpty(),
   
]
const getMessagesvalidator = ()=>[
    param('id').notEmpty().withMessage("Please send params id").custom(validateObjectId).withMessage('Invalid chat ID'),
]

const chatIdvalidator = ()=>[
    param('id').notEmpty().withMessage("Please send params id").custom(validateObjectId).withMessage('Invalid chat ID'),
]

const renameGroupvalidator = ()=>[
    param('id').notEmpty().withMessage("Please send params id").custom(validateObjectId).withMessage('Invalid chat ID'),
    body("name" , "please enter  name").notEmpty(),
]

const sendRequestvalidator = ()=>[
    body("userId" , "please enter  userId").notEmpty(),
]
const acceptRequestvalidator =()=>[
    body("requestId" , "please enter   request Id").notEmpty(), 
    body("accept" , "please enter   acceptance ").notEmpty().isBoolean().withMessage("accept must be boolean"),
]

const adminLoginvalidator = ()=>[
    body("secretKey" , "please enter  secret key").notEmpty(),
]


export { acceptRequestvalidator, addMembersvalidator, adminLoginvalidator, chatIdvalidator, getMessagesvalidator, leaveGroupvalidator, loginValidator, newGroupvalidator, registerValidator, removeMembersvalidator, renameGroupvalidator, sendAttachementsvalidator, sendRequestvalidator, validateHandler };
