import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers?.("Authorization")?.replace("Bearer ", "")

        if (!token) {
            return res.status(401).json(
                new ApiError(401, "Unauthorized request")
            )
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // console.log(decodedToken)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        
        if (!user) {
            // discuss about this in frontend
            return res.status(401).json(
                new ApiError(401, "Invalid access token")
            )
        }

        req.user = user
        next()
    } catch (error) {
        return res.status(401).json(
            new ApiError(401, "Unauthorized request")
        )
    }

})