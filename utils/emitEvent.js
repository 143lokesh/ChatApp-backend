
import { getSockets } from "../lib/helper.js";



const emitEvent = (req,event,users,data)=>{
      let io = req.app.get("io");
      const userSocket = getSockets(users);
      io.to(userSocket).emit(event , data)
}

export {emitEvent}