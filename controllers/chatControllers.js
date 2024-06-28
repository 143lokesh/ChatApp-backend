import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { deleteFilesFromCloudinary, uploadFilesInCloudinary } from "../utils/deleteFilesFromCloudinary.js";
import { emitEvent } from "../utils/emitEvent.js";
import { ErrorHandler } from "../utils/utility.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (members.length < 2)
      return next(new ErrorHandler("Group must have 3 Members", 404));
    const allMembers = [...members, req.user];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
    });

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
      success: true,
      message: "Group Created",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while creating new Group",
      error: err.message,
    });
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name username  avatar"
    );

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
      const otherMember = getOtherMember(members, req.user);
      return {
        _id,
        groupChat,
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
      };
    });
    return res.status(201).json({
      success: true,
      chat: transformedChats,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while fetching user Chats",
      error: err.message,
    });
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      creator: req.user,
      groupChat: true,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(201).json({
      success: true,
      groups,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while fetching user groups",
      error: err.message,
    });
  }
};

const addMembers = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;

    if (!chatId) {
      return next(new ErrorHandler("Pls Send Chat Id", 404));
    }
    if (!members || members.length < 1) {
      return next(new ErrorHandler("pls Add members", 404));
    }
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return  next(new ErrorHandler("No group found with the Chat Id", 404));
    }
    if (!chat.groupChat) {
       return next(new ErrorHandler("This is Not a group", 404));
    }
    if (chat.creator.toString() !== req.user.toString()) {
       return next(
         new ErrorHandler(
          "You doesn't have the authority to add Members in this group ",
          404
        )
      );
    }

    const allNewMembersPromise = members.map((id) => User.findById(id, "name"));
    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allNewMembers
      .filter((i) => !chat.members.includes(i._id.toString()))
      .map((i) => i._id);

    chat.members.push(...uniqueMembers.map((i) => i._id));

    if (chat.members.length > 100) {
      return next(new ErrorHandler("Group members limit reached", 404));
    }

    await chat.save();
    const allUsersName = allNewMembers.map((i) => i.name).join(",");

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUsersName} has been added to ${chat.name} group`
    );
    emitEvent(req, REFETCH_CHATS, chat.members);

    res.status(200).json({
      success: true,
      message: "Members added Successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while adding members  in the group",
      error: err.message,
    });
  }
};

const removeMembers = async (req, res, next) => {
  try {
    const { userId, chatId } = req.body;
    if (!chatId) {
      return next(new ErrorHandler("Pls Send Chat Id", 404));
    }
    if (!userId) {
      return next(new ErrorHandler("Pls provide user Id", 404));
    }
    const [chat, user] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);
    if (!chat) {
       return next(new ErrorHandler("No group found with the Chat Id", 404));
    }
    if (!chat.groupChat) {
       return next(new ErrorHandler("This is Not a group", 404));
    }
    if (chat.creator.toString() !== req.user.toString()) {
       return next(
        new ErrorHandler(
          "You doesn't have the authority to add Members in this group ",
          404
        )
      );
    }
    if (chat.members.length <= 3) {
      return next(new ErrorHandler("Group must have 3 members", 400));
    }
    const allChatMembers = chat.members.map((i)=>i.toString())
    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.members,
      {message:`${user.name} has been removed from ${chat.name} group`,
        chatId
      }
    );
    emitEvent(req, REFETCH_CHATS, allChatMembers);
    res.status(200).json({
      success: true,
      message: "Member removed Successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while removing members  in the group",
      error: err.message,
    });
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      next(new ErrorHandler("No group found with the Chat Id", 404));
    }
    if (!chat.groupChat) {
      next(new ErrorHandler("This is Not a group", 404));
    }
    const remaingMembers = chat.members.filter(
      (member) => member.toString() !== req.user.toString()
    );
    if (remaingMembers.length <= 3) {
      return next(new ErrorHandler("Group must have 3 members", 400));
    }
    if (chat.creator.toString() === req.user.toString()) {
      const newCreator = remaingMembers[0];
      chat.creator = newCreator;
    }
    chat.members = remaingMembers;
    const user = await User.findById(req.user, "name");

    await chat.save();
    emitEvent(
      req,
      ALERT,
      chat.members,
      {message:`${user.name} has been removed from ${chat.name} group`,chatId}
    );
    res.status(200).json({
      success: true,
      message: "left  Successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while deleting group",
      error: err.message,
    });
  }
};

const sendAttachements = async(req, res, next)=>{
  try{

     const {chatId }= req.body;
     const files = req.files || [] ;
     const [chat , me] = await Promise.all([ Chat.findById(chatId),
      User.findById(req.user , "name")
     ])

     
     if (!chat) {
        return next(new ErrorHandler("No group found with the Chat Id", 404));
     }
      if(files.length <1){
          return next(new ErrorHandler("please upload attachements" , 400))
      }
      if(files.length >5){
        return next(new ErrorHandler("attachements size should be betwwen 1-5" , 400))
    }
     
     const attachements = await uploadFilesInCloudinary(files)
     const messageForRealTime={
      content : "",
      attachements :attachements,
      sender:{
        _id : me._id,
        name:me.name,
      },
      chat:chatId,
     }
     const messageForDb={
      content : "",
      attachements :attachements,
      sender:me._id,
      chat:chatId,
     }
     const message = await Message.create(messageForDb)
     emitEvent(req, NEW_MESSAGE ,chat.members , {
      message : messageForRealTime,
      chatId
     } )
     emitEvent(req, NEW_MESSAGE_ALERT , chat.members, {chatId})
    return res.status(200).json({
      success:true,
      message: message
    });
  }
  catch(err){
    console.log(err);
    res.status(500).json({
      message: "An error occurred while sending attachements",
      error: err.message,
    });
  }
}


const getChatDetails=async(req,res,next)=>{
  try{
    if(req.query.populate === "true"){
       const chat = await Chat.findById(req.params.id).populate("members" , "name avatar").lean()
       if (!chat) {
        return next(new ErrorHandler("No group found with the Chat Id", 404));
     }
    chat.members = chat.members.map(({_id , name , avatar})=>({
      _id , name , avatar:avatar.url,
    }))
    
    return res.status(201).json({
      success:true,
      chat
    })
    }
    else{
       const chat = await Chat.findById(req.params.id);
       if (!chat) {
        return next(new ErrorHandler("No group found with the Chat Id", 404));
     }

     return res.status(201).json({
      success:true,
      chat
    })
    }
  }
  catch(err){
    console.log(err);
    res.status(500).json({
      message: "An error occurred while getting ChatDetails",
      error: err.message,
    });
  }
}

const renameGroup=async(req,res,next)=>{
  try{
        const chatId = req.params.id;
        const {name} = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) {
          return  next(new ErrorHandler("No group found with the Chat Id", 404));
        }
        if (!name) {
          return  next(new ErrorHandler("Pls Provide with the name ", 404));
        }
        if (!chat.groupChat) {
           return next(new ErrorHandler("This is Not a group", 404));
        }
        if (chat.creator.toString() !== req.user.toString()) {
           return next(
             new ErrorHandler(
              "You doesn't have the authority rename group ",
              404
            )
          );
        }
        chat.name = name
        chat.save();

        emitEvent(req, REFETCH_CHATS , chat.members);

        return res.status(200).json({
          success:true,
          message:"Group Name Changed Successfully"
        })


  }
  catch(err){
    console.log(err);
    res.status(500).json({
      message: "An error occurred while renaming the group",
      error: err.message,
    });
  }
}


const deleteChat = async(req,res,next)=>{
  try{
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return  next(new ErrorHandler("No group found with the Chat Id", 404));
    }
    const members =chat.members;

    if(chat.groupChat  && chat.creator.toString() !== req.user.toString() ){
      return next (new ErrorHandler("You are not allowed to delete this group" ,404))
    }
     if(!chat.groupChat && !chat.members.includes(req.user)){
      return next(new ErrorHandler("You are not allowed to delete this group" ,404))
     }
     const messagesWithAttachements = await Message.find({chat:chatId,
      attachements :{$exists:true , $ne:[]}
     });

     const public_ids=[];
     messagesWithAttachements.forEach(({attachements})=>{
      attachements.forEach(({public_id})=>{
        public_ids.push(public_id)
      })
     })

     await Promise.all([
      // delete files from cloudinary 
      deleteFilesFromCloudinary(public_ids) ,
      chat.deleteOne(),
      Message.deleteMany({chat:chatId})
     ])

     emitEvent(req,REFETCH_CHATS ,members);

     return res.status(200).json({
      success:true,
      message:"Chat deleted Successsfully"
     })
  }
  catch(err){
    console.log(err);
    res.status(500).json({
      message: "An error occurred while deleting the chat",
      error: err.message,
    });
  }
}

const getMessages = async(req,res,next)=>{
  try{
      const chatId = req.params.id
       const {page=1} =req.query;
      const resultPerPage =20;
      const skip = (page-1) *resultPerPage
      const chat = await Chat.findById(chatId)
      if(!chat) return next(new ErrorHandler("chat not found",404))
        if(!chat.members.includes(req.user.toString())){
          return next(new ErrorHandler("You are not allowed to access this chat" , 404))
        }
       const [messages,totalMessageCount] = await Promise.all([
        Message.find({chat:chatId}).sort({createdAt:-1})
       .skip(skip)
       .limit(resultPerPage)
       .populate("sender" , "name  ")
       .lean() , Message.countDocuments({chat:chatId})
       ]) 
       const totalPages = Math.ceil(totalMessageCount/resultPerPage)||0
       return res.status(201).json({
        success:true,
        messages:messages.reverse(),
        totalPages
       })

  }
  catch(err){
    console.log(err);
    return res.status(500).json({
      message:"Error occured while getting messages of chat",
      error:err.message
    })
  }
}


export {
  addMembers, deleteChat, getChatDetails, getMessages, getMyChats,
  getMyGroups, leaveGroup, newGroupChat, removeMembers, renameGroup, sendAttachements
};

