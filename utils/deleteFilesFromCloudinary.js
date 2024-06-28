import { v4 as uuid } from "uuid";
import {v2 as cloudinary} from "cloudinary"
import { getBase64 } from "../lib/helper.js";

const uploadFilesInCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    const formatedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formatedResults;
  } catch (error) {
    throw new Error("Error Uploading files into Cloudnary", error);
  }
};

const deleteFilesFromCloudinary = async (public_ids) => {};

export { deleteFilesFromCloudinary, uploadFilesInCloudinary };
