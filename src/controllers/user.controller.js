import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

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
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
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

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(decodedToken?._id)


        const options = {
            httpOnly: true,
            secure: true
        }

        req.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200,
                    { accessToken, refreshToken: refreshToken },
                    "access token regenerated successfully"
                )
            )
    } catch (error) {
        return new ApiError(500, error?.message || "something went wrong while regenerating access token")
    }
})

export {
    registerUser,
    logedInUser,
    logoutUser,
    regenerateAccessToken
}