import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })


        //file has been uploaded successfully on cloudinary
        // console.log("File uploaded on cloudinary", response.url)

        fs.unlinkSync(localFilePath)


        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // delete the locally saved temporary file as upload failed
        return null
    }
}

const deleteFromCloudinary = async (url) => {
    try {
        if (!url) return null;

        // Extract public_id from URL
        // Example URL: https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/public_id.jpg
        const publicId = url.split('/').pop().split('.')[0];

        // Delete the file from cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.log("Error while deleting file from cloudinary", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }