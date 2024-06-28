import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import {faker, simpleFaker} from "@faker-js/faker"


const createUser = async(numUsers)=>{
    try{
         const usersPromise = [];

         for (let index = 0; index < numUsers; index++) {
             const tempUser = User.create({
                name:faker.person.fullName(),
                username : faker.internet.userName(),
                bio:faker.lorem.sentence(10),
                password:"senju",
                avatar:{
                    url:faker.image.avatar(),
                    public_id:faker.system.fileName()
                }
             }) 
             usersPromise.push(tempUser)
         }
         
         await Promise.all(usersPromise)
         console.log("users Created" , numUsers)
         process.exit(1)
    }
    catch(err){
       console.log(err.message) 
    }
}

const createSingleChats = async(chatsCount)=>{
   try{
      const users  = await User.find().select("_id");
      const chatsPromise =[];
     
      for(let i=0;i<chatsCount;i++){
        for(let j=i+1 ; j<chatsCount;j++){
            chatsPromise.push(
                Chat.create({
                    name:faker.lorem.word(2),
                    members:[users[i],users[j]],
                })
            )
        }
      }
      await Promise.all(chatsPromise)
      console.log("single Chats Created")
      process.exit()

   }
   catch(err){
    console.log(err.message)
   }
}
const createGroupChats = async(chatsCount)=>{
    try{
        const users  = await User.find().select("_id");
        const chatsPromise =[];

        for(let i=0;i<chatsCount;i++){
          const numMembers = simpleFaker.number.int({min:3,max:users.length});
          
          const members=[];
          for(let j=0 ;j<numMembers;j++){
            const randomIndex = Math.floor(Math.random()*users.length);
            const randomUser = users[randomIndex];

            if(!members.includes(randomUser)){
                members.push(randomUser)
            }
          }
          const chat =Chat.create({
            groupChat:true,
            name:faker.lorem.words(1),
            members,
            creator:members[0]
          })
          chatsPromise.push(chat)
        }
        await Promise.all(chatsPromise)
        console.log("group Chats Created")
        process.exit()
    }
    catch(err){
     console.log(err.message)
    }
}

const createMessages = async(numMessages)=>{
    try{
       const users = await User.find().select("_id")
       const chats = await Chat.find().select("_id")

       const messagePromise=[]
       for (let i = 0; i < numMessages; i++) {
        const randomUser = users[Math.floor(Math.random() *users.length)];
        const randomChat = chats[Math.floor(Math.random() *chats.length)]
          messagePromise.push(
            Message.create({
               chat:randomChat,
               sender:randomUser,
               content:faker.lorem.sentence()  
            })
          )
       }

       await Promise.all(messagePromise)
       console.log("Messages Created")
       process.exit()
    }
    catch(err){
        console.log(err);
    }
}

const createMessagesInAChat = async(chatId , numMessages)=>{
    try{
       const users = await User.find().select("_id");
       const messagePromise=[];

       for (let i = 0; i < numMessages; i++) {
        const randomUser = users[Math.floor(Math.random() *users.length)];
        messagePromise.push(
            Message.create({
                chat:chatId,
                sender:randomUser,
                content:faker.lorem.sentence()
            })
        )
       }
       await Promise.all(messagePromise)
       console.log("Messages Created")
       process.exit()
    }
    catch(err){
        console.log(err);
    }
}




export {createUser , createSingleChats,createGroupChats ,createMessagesInAChat,createMessages}