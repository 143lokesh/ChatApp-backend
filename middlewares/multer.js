import multer from "multer";


const multerUploader = multer({
    limits:{fileSize: 1024 *1024* 5}
});


 const singleAvatar =multerUploader.single("avatar");

 const  attachementsMulter = multerUploader.array("files" , 5)


export {singleAvatar , attachementsMulter}