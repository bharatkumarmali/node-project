import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscrioption.modles.js";
import mongoose from "mongoose";
import { Todo } from "../models/todo.models.js";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        // refresh token send in existing user
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        // access token and refresh token return 
        return { accessToken, refreshToken }
    } catch (error) {
        // throw new ApiError(500, "something went wrong while generating access and refresh token")
        return res.status(500).json(
            new ApiError(500, "something went wrong while generating access and refresh token")
        )
    }
}


const registerUser = asyncHandler(async (req, res) => {
    const { username, password, email, fullName } = req.body

    // all fields required
    if (
        [username, fullName, email, password].some((field) =>
            field?.trim() === ""
        )
    ) {
        // throw new ApiError(400, "all fields are required")
        return res.status(400).json(
            new ApiError(400, "all fields are required")
        )
    }

    // email check is already exists
    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existingUser) {
        // throw new ApiError(409, "username or email already exists")
        return res.status(409).json(
            new ApiError(409, "username or email already exists")
        )
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage ? req.files?.coverImage[0]?.path : ""

    if (!avatarLocalPath) {
        // throw new ApiError(400, "avatar file is required")
        return res.status(400).json(
            new ApiError(400, "avatar file is required")
        )
    }

    const avtar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avtar) {
        // throw new ApiError(400, "avatar upload failed")
        return res.status(400).json(
            new ApiError(400, "avatar upload failed")
        )
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
        // throw new ApiError(500, "something went wrong while registering user")
        return res.status(500).json(
            new ApiError(500, "something went wrong while registering user")
        )
    }

    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})


const logedInUser = asyncHandler(async (req, res) => {

    // req.body -> data (username or email, password)
    const { username, email, password } = req.body;

    // console.log("req.body ----------- ", req.body)

    // email or username is required
    // if (!(username || email)) {
    if (!email) {
        // throw new ApiError(400, "username or email is required")
        return res.status(400).json(
            new ApiError(400, "email is required")
        )
    }

    //username or email check 
    const user = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    })

    // if user is not found throw error
    if (!user) {
        // throw new ApiError(400, "username or email not found")
        return res.status(400).json(
            new ApiError(400, "username or email not found")
        )
    }

    // if user is found then check password match or not
    const isPasswordValid = await user.isPasswordCorrect(password)

    // if password dose not match throw error
    if (!isPasswordValid) {
        // throw new ApiError(401, "password is not valid")
        return res.status(401).json(
            new ApiError(401, "password is not valid")
        )
    }

    // if password match then generate access token and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    // 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // access token and refresh token send in cookie
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // $set: {
            //     refreshToken: undefined
            // }
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        )
})


const regenerateAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = await req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            return res.status(401).json(
                new ApiError(401, "unauthorized request")
            )
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            return res.status(401).json(
                new ApiError(401, "unauthorized request")
            )
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            return res.status(401).json(
                new ApiError(401, "refresh token is not valid or expired")
            )
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { accessToken, refreshToken }, "access token regenerated successfully")
            )

    } catch (error) {
        return res.status(500).json(
            new ApiError(500, error?.message || "something went wrong while regenerating access token")
        )
    }
})


const changeUserPasswod = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json(
            new ApiError(400, "Old password and new password are required")
        )
    }

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        return res.status(400).json(
            new ApiError(400, "Old password is not correct")
        )
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!email || !fullName) {
        return res.status(400).json(
            new ApiError(400, "Email and full name are required")
        )
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,  // fullName
                email: email  // email
            }
        },
        { new: true }  // after update return updated user
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "User account details updated successfully")
    )
})


const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    console.log(avatarLocalPath)

    if (!avatarLocalPath) {
        return res.status(400).json(
            new ApiError(400, "avatar file is required")
        )
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        return res.status(400).json(
            new ApiError(400, "avatar upload failed")
        )
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    )
})


const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        return res.status(400).json(
            new ApiError(400, "cover image file is required")
        )
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        return res.status(400).json(
            new ApiError(400, "cover image upload failed")
        )
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "User cover image updated successfully")
    )
})


const getUserChannelsProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        return res.status(400).json(
            new ApiError(400, "username is missing")
        )
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel.length) {
        return res.status(404).json(
            new ApiError(404, "channel does not exist")
        )
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0], "User channel profile fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully")
    )
})


const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json(
            new ApiError(400, "User ID is required")
        )
    }

    const user = await User.findById(id)


    if (!user) {
        return res.status(404).json(
            new ApiError(404, "User not found")
        )
    }

    // Delete avatar and cover image from cloudinary
    if (user.avatar) {
        await deleteFromCloudinary(user.avatar)
    }
    
    if (user.coverImage) {
        await deleteFromCloudinary(user.coverImage)
    }

    // Delete user from database
    await user.deleteOne()

    // Delete all todos of the user
    await Todo.deleteMany({ user_id: user._id })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, null, "User deleted successfully")
        )
})


export {
    registerUser,
    logedInUser,
    logoutUser,
    regenerateAccessToken,
    changeUserPasswod,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelsProfile,
    getWatchHistory,
    deleteUser
}