import jwt from "jsonwebtoken"

const cokkieOPtions={
    maxAge: 30*24*60*60*1000,
    sameSite:"none",
    httpOnly:true,
    secure:true
}

 export const sendToken = (res , user, code , message)=>{
    const token = jwt.sign({
        _id:user._id
    },
    process.env.JWT_SECRET
    )
    return res.status(code).cookie("ChatApp-token" , token ,cokkieOPtions).json({
        success: true ,
        user,
        message ,
    })
    
}


