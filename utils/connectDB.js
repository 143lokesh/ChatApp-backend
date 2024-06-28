import mongoose from "mongoose"



const connectDb =(url)=>{
       mongoose.connect(url , {
        dbName:"Chat_App"
       }).then((data)=>{
        console.log(`Successfully Connected To DataBase  ${data.connection.host}`)

       })
       .catch((err)=>{
        console.log(err);
        throw err;
       })
}

export  {connectDb}