import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  // extract the token from cookies or the Authorization header
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  // decode the token using the secret key
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  // find the user and attach their info to the request object (excluding password)
  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken",
  );

  if (!user) {
    throw new ApiError(401, "Invalid Access Token");
  }

  req.user = user;
  next();
});
