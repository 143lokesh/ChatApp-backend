import { compare } from "bcrypt";
import {User} from "../models/user.js"
import { sendToken } from "../utils/sendTokens.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { emitEvent } from "../utils/emitEvent.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { uploadFilesInCloudinary } from "../utils/deleteFilesFromCloudinary.js";


const newUser = async(req,res,next)=>{
    try{
        const {name , username , password ,bio } = req.body;
        const file = req.file
        if(!file){
           return next(new ErrorHandler("please upload avatar",404))
        }
        const result = await uploadFilesInCloudinary([file]);
        const avatar ={
            public_id : result[0].public_id,
            url:result[0].url,
        }
         const user = await User.create({
            name , 
            username ,
            password ,
            bio,
            avatar
        })
        sendToken(res , user , 201 , "User Created")
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            message: "An error occurred while creating the user",
            error: err.message,
          });
    }
}


const login = async(req , res , next )=>{
    try{
       const { username , password} = req.body;
       const user = await User.findOne({
        username
       }).select("+password");
       if(!user){
        return next(new ErrorHandler("Invalid User" , 400));
       }
       const isPasswordMatched = await compare(password , user.password);
       
       if(!isPasswordMatched){
        return next(new ErrorHandler("Invalid Password",400));
       }
       sendToken(res , user , 200 , `Welcome Back ${user.name}`)
    }
    catch(err){
 
        console.log(err);
        res.status(500).json({
            message: "An error occurred while LogIn",
            error: err.message,
          });
        
    }
}


const getMyProfile = async(req,res,next)=>{
    try{
         const user = await User.findById(req.user);
         res.status(200).json({
            success:true,
            user
         })
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            message: "An error occurred while getting the profile",
            error: err.message,
          });
    }
}


const logout = async(req,res,next)=>{
    
    const cokkieOPtions={
        maxAge: 0,
        sameSite:"none",
        httpOnly:true,
        secure:true
    }
    try{
       
         res.status(200).cookie("ChatApp-token" , "" , cokkieOPtions).json({
            success:true,
            message:"Logout Successful"
         })
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            message: "An error occurred while getting the profile",
            error: err.message,
          });
    }
}


const searchUser =async(req , res, next)=>{
     try{
        const {name=""} = req.query;
         
        const myChats = await Chat.find({groupChat:false , members:req.user});
        const allUsersFromMyChats = myChats.map((chat)=>chat.members).flat();

        const allUserExeptMeAndFriend = await User.find({
            _id :{$nin : allUsersFromMyChats},
            name:{$regex:name , $options:"i"},
        })
        const users = allUserExeptMeAndFriend.map(({_id , name,avatar})=>({
            _id , name, avatar:avatar.url
        }))

        return res.status(200).json({
            success:true,
            message:users
         })  
     }
     catch(err){
        console.log(err);
        res.status(500).json({
            message: "An error occurred while searching the profile",
            error: err.message,
          });
     }
}


const sendFriendRequest=async(req , res, next)=>{
     try{
        const {userId} = req.body;  
        const request = await Request.findOne({
           $or:[
            {sender:req.user , receiver:userId},
            {sender:userId , receiver:req.user},
           ]
        })
        if(request){
           return next(new ErrorHandler("request already sent" , 404)) 
        }

        await Request.create({
            sender:req.user,
            receiver:userId,
        })

        emitEvent(req, NEW_REQUEST , [userId]  )

        return res.status(200).json({
            success:true,
            message:" Friend Request sent successfully"
        })
     }
     catch(err){
        console.log(err);
        res.status(500).json({
            message: "An error occurred while sending request",
            error: err.message,
          });
     }
}

const acceptFriendRequest=async(req , res, next)=>{
    try{
       const {requestId , accept} = req.body;  
       
       const request = await Request.findById(requestId).populate("sender" ,"name").populate("receiver" , "name")
       if(!request){
        return next(new ErrorHandler("request not found" , 404)) 
     }
     if(request.receiver._id.toString() !==  req.user.toString()){
        return next(new ErrorHandler("Unauthorized" , 401))
     }
     if(!accept){
        await request.deleteOne();
        return res.status(200).json({
            message:" Friend Request Rejected ",
            success:true
        })
     }
     const members = [request.sender._id , request.receiver ._id]

     await Promise.all([Chat.create({members ,
         name:`${request.sender.name}-${request.receiver.name}`
        }) , request.deleteOne()])

      emitEvent(req,REFETCH_CHATS, members )


       return res.status(200).json({
           success:true,
           message:" Friend Request accepted successfully",
           senderId:request.sender._id
       })
    }
    catch(err){
       console.log(err);
       res.status(500).json({
           message: "An error occurred while accepting request",
           error: err.message,
         });
    }
}

const getNotifications = async(req,res,next)=>{
    try{
        const request = await Request.find({receiver:req.user}).populate("sender" , "name avatar")

        const allRequests = request.map(({_id ,sender})=>({
            _id,sender:{
                _id:sender._id,
                name:sender.name,
                avatar:sender.avatar.url
            }
        }))
        return res.status(200).json({
            success:true,
            message:allRequests
        })

    }
    catch(err){
        console.log(err);
       res.status(500).json({
           message: "An error occurred while fetching notifications",
           error: err.message,
         });
    }
}

const getMyFriends = async(req,res,next)=>{
    try{
         const chatId = req.query.chatId;
         const chat = await Chat.find({members:req.user , groupChat:false}).populate("members" ,"name avatar")

         const friends = chat.map(({members})=>{
            const otherUser = getOtherMember(members , req.user)
            return {
                _id:otherUser._id , 
                name:otherUser.name,
                avatar:otherUser.avatar.url
            }
         })

         if(chatId){
             const chats = await Chat.findById(chatId);
             const availableFriends = friends.filter((friend)=>!chats.members.includes(friend._id));

             return res.status(200).json({
                success:true,
                friends:availableFriends
             })
         }
         else{
            return res.status(200).json({
                success:true,
                friends
            }) 
         }
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            message:"Error occured while fetching friends",
            error:err.message
        })
    }
}


export {login , newUser ,getMyProfile ,acceptFriendRequest, logout,searchUser ,sendFriendRequest,getNotifications ,getMyFriends};