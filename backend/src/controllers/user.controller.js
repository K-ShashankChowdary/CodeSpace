import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // Must be false for HTTP (AWS IP)
  sameSite: "lax",
  path: "/", 
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("JWT ERROR:", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if ([username, email, password].some((f) => !f || f.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) throw new ApiError(409, "User already exists");

  const user = await User.create({ username, email, password });
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  return res
    .status(201)
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(new ApiResponse(201, { user: createdUser, accessToken }, "User registered and logged in"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) throw new ApiError(400, "Username or email is required");

  // 🚨 THE FIX: Only add the fields to the query if they actually exist in the request
  const searchConditions = [];
  if (username) searchConditions.push({ username });
  if (email) searchConditions.push({ email });

  const user = await User.findOne({ $or: searchConditions });
  
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  return res
    .status(200)
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, "Logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true });

  return res
    .status(200)
    .clearCookie("accessToken", COOKIE_OPTIONS)
    .clearCookie("refreshToken", COOKIE_OPTIONS)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "User fetched"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized");

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user || incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is invalid or expired");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, COOKIE_OPTIONS)
      .cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Token refreshed"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, getCurrentUser, refreshAccessToken };

