import  jwt from "jsonwebtoken";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretKey } from "../server.js";


const adminLogin = async(req,res,next)=>{
    try{
        const {secretKey}=req.body;
       // console.log(secretKey)
        const isMatch = secretKey === adminSecretKey
        if(!isMatch){
            return next(new ErrorHandler("Invalid AdminKey",401))
        }
        
        const Token = jwt.sign(secretKey ,process.env.JWT_SECRET)
        const cookieOPtions={
            maxAge: 15*60*1000,
            sameSite:"none",
            httpOnly:true,
            secure:true
        }
        return res.status(200).cookie("ChatApp-AdminToken" ,Token ,{
            cookieOPtions 
        }).json({
            success:true,
            message:"Authenticated successfully Welcome LOKESH "
        })

    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            message:"error ocurred while logging in the admin",
            error:err.message
        })
    }
}

const allUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    const transformUsers = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);
        return {
          name,
          username,
          _id,
          avatar: avatar.url,
          groups,
          friends,
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: transformUsers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      Message: "Error occurred while fetching users for admin dashboard",
      error: err.message,
    });
  }
};


const allChats = async (req, res, next) => {
    try {
      const chats = await Chat.find({})
        .populate("members", "name avatar")
        .populate("creator", "name avatar");
  
      const transformChats = await Promise.all(
        chats.map(async (chat) => {
          const { members = [], _id, groupChat, name, creator = {} } = chat;
  
          const totalMessages = await Message.countDocuments({ chat: _id });
          return {
            _id,
            name,
            groupChat,
            avatar: members.slice(0, 3).map((member) => member.avatar?.url || ""),
            members: members.map((member) => ({
              _id: member._id,
              name: member.name,
              avatar: member.avatar?.url || "",
            })),
            creator: {
              _id: creator._id || "",
              name: creator.name || "None",
              avatar: creator.avatar?.url || "",
            },
            totalMembers: members.length,
            totalMessages: totalMessages,
          };
        })
      );
  
      return res.status(200).json({
        success: true,
        chats: transformChats,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: "Error occurred while fetching chats for admin dashboard",
        error: err.message,
      });
    }
  };


const allMessages = async (req, res, next) => {
  try {

    const messages = await Message.find({}).populate("sender" , "name avatar").populate("chat" , "groupChat")


    const transformMessages = messages.map(({content , attachements,_id ,sender,createdAt, chat})=>{
           return {
            content ,
            _id,
            attachements,
            createdAt,
            chat:chat._id,
            groupChat:chat.groupChat,
            sender:{
                _id:sender._id,
                name:sender.name,
                avatar:sender.avatar.url
            }
           }
    })

    return res.status(200).json({
        success:true,
        messages:transformMessages
    })

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      Message: "Error occurred while fetching messages for admin dashboard",
      error: err.message,
    });
  }
};


const getDashBoardStats = async(req,res)=>{
    try{
        const [groupsCount,usersCount,messagesCount,totalChatsCount] = await Promise.all([
            Chat.countDocuments({groupChat:true}),
            User.countDocuments(),
            Message.countDocuments(),
            Chat.countDocuments()
        ])

        
        const today = new Date();
        const last7days =  new Date();
        last7days.setDate(last7days.getDate()-7);

        const last7daysMessages = await Message.find({
            createdAt:{
                $gte:last7days,
                $lte:today,
            }
        }).select("createdAt");

        const messages = new Array(7).fill(0);
        
        last7daysMessages.forEach(message =>{
            const indexApprox = (today.getTime()-message.createdAt.getTime())/ (1000*60*60*24);
            const index =Math.floor(indexApprox);
            messages[6-index]++
        })
         const stats ={
            groupsCount,usersCount,messagesCount,totalChatsCount,
            singleChat:totalChatsCount-groupsCount,
            messagesChart:messages
         }
        return res.status(200).json({
            success:true,
            message:stats
        })
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            message:"Error occurred while fetching dashbpard stats",
            error:err.message
        })
    }
}


const adminLogOut = async(req,res,next)=>{
    try{
        const cookieOPtions={
            maxAge: 0,
            sameSite:"none",
            httpOnly:true,
            secure:true
        }
        return res.status(200).cookie("ChatApp-AdminToken" ,"" ,{
            cookieOPtions , maxAge:0
        }).json({
            success:true,
            message:" Logout SuccessFul "
        })

    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            message:"error ocurred while logging out the admin",
            error:err.message
        })
    }
}

const getAdminData = async(req,res,next)=>{
   try{
       return res.status(200).json({
        admin:true
       })
   }
   catch(err){
    console.log(err);
    return res.status(500).json({
      message:"error occured while fetching admin data",
      error:err.message
    })
   }
}

export { allUsers, allMessages, getAdminData,allChats,getDashBoardStats,adminLogin,adminLogOut };
