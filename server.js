import express from "express";
import userRoutes from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import { connectDb } from "./utils/connectDB.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { CHAT_JOINED, CHAT_LEFT, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

dotenv.config({
  path: "./.env",
});
const MONGODB_URL = process.env.MONGO_URL;
const PORT = process.env.PORT;
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "Lokesh@890";
export const envMode = process.env.NODE_ENV;

export const userSocketIDs = new Map();
const onlineUsers = new Set()

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io" ,io);

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

connectDb(MONGODB_URL);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", adminRoutes);

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

io.on("connection", (socket) => {
  const user =socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);
  // new Message 
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    //console.log(messageForRealTime)
    const messageForDb = {
      content: message,
      sender: user._id,
      chat: chatId,
    };
    //console.log(messageForDb)
    const membersSockets = getSockets(members);

    io.to(membersSockets).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSockets).emit(NEW_MESSAGE_ALERT, { chatId });
    try {
      await Message.create(messageForDb);
    } catch (err) {
      console.log(err.message);
    }
  });

  // typing

  socket.on(START_TYPING ,({members,chatId})=>{
    const userSockets = getSockets(members);
     socket.to(userSockets).emit(START_TYPING ,{chatId} );
  }) ;

  socket.on(STOP_TYPING ,({members,chatId})=>{
    const userSockets = getSockets(members);
     socket.to(userSockets).emit(STOP_TYPING ,{chatId} );
  })

  //online users
  socket.on(CHAT_JOINED,({userId,members})=>{
    onlineUsers.add(userId.toString())
    console.log(members)
     const membersSockets = getSockets(members)
    io.to(membersSockets).emit(ONLINE_USERS , Array.from(onlineUsers))
  })

  socket.on(CHAT_LEFT,({userId,members})=>{
    onlineUsers.delete(userId.toString())
     const membersSockets = getSockets(members)
     io.to(membersSockets).emit(ONLINE_USERS , Array.from(onlineUsers))
  })
  
    

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString())
    socket.broadcast.emit(ONLINE_USERS , Array.from(onlineUsers))
  });
});

app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(
    `server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});
