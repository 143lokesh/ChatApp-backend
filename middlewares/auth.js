import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretKey } from "../server.js";
import { User } from "../models/user.js";



const isAuthenticated = async( req , res, next)=>{
    try{
        const  token = req.cookies["ChatApp-token"]
       
        if(!token){
            return next(new ErrorHandler("Please Login to access this route" , 401))
        } 
        const decodedData = jwt.verify(token , process.env.JWT_SECRET);
        req.user = decodedData._id;
        next();
    }
    catch(err){
        return next(new ErrorHandler(err.message , 401))
    }
}
const adminOnly = async( req , res, next)=>{
    try{
        const  token = req.cookies["ChatApp-AdminToken"]
       
        if(!token){
            return next(new ErrorHandler("Only admin can access" , 401))
        } 
        const secretKey = jwt.verify(token , process.env.JWT_SECRET);
       
        const isMatch = secretKey === adminSecretKey
        if(!isMatch){
            return next(new ErrorHandler("Invalid Admin Key" , 401))
        }
        next();
    }
    catch(err){
        return next(new ErrorHandler(err.message , 401))
    }
}


const socketAuthenticator = async(err,socket,next)=>{
     try {
        if(err){
            return next(err)
        }
        const authToken = socket.request.cookies["ChatApp-token"];
        if(!authToken){
            return next(new ErrorHandler("Please Login to access this route - no token",404))
        }
        const decodedData = jwt.verify(authToken , process.env.JWT_SECRET);
        const user = await User.findById(decodedData._id);
        if(!user){
            return next(new ErrorHandler("Please Login to access this route",404))
        }
        socket.user = user
        return next();
     } catch (error) {
        console.log(error)
        return next(new ErrorHandler("Please Login to access this route",404))
     }
}

export {isAuthenticated,adminOnly ,socketAuthenticator}