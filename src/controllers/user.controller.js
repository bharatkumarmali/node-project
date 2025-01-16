import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import uploadOnCloudinary from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req, res) => {
    const { username, password, email, fullName } = req.body


    // all fields required
    if (
        [username, fullName, email, password].some((field) =>
            field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "all fields are required")
    }

    // email check is already exists
    const existingUser = await User.findOne({
        $or: [
            { email },
            { username }
        ]
    })
    if (existingUser) {
        throw new ApiError(409, "username or email already exists")
    }

    // console.log("body---------",req.body)
    // console.log("files---------",req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage ? req.files?.coverImage[0]?.path : ""


    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }

    const avtar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if (!avtar) {
        throw new ApiError(400, "avatar upload failed")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avtar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering user")
    }

    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

export {
    registerUser
}