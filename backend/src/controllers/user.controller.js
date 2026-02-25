import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// create a utility function to handle generating both tokens simultaneously
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // attach the refresh token to the user document and save it, bypassing validation checks
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(
      "Something went wrong while generating refresh and access tokens",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // extract registration details from the incoming request body
  const { username, email, password } = req.body;

  // check if any field is empty and throw an error to prevent invalid database entries
  if ([username, email, password].some((field) => field?.trim() === "")) {
    throw new Error("All fields are required");
  }

  // query the database to ensure no existing user has the same email or username
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new Error("User with email or username already exists");
  }

  // create the user, triggering the pre-save hook to hash the password
  const user = await User.create({ username, email, password });

  // fetch the newly created user without exposing the password or refresh token
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser) {
    throw new Error("Something went wrong while registering the user");
  }

  // return a 201 Created status alongside the sanitized user data
  return res.status(201).json({
    success: true,
    data: createdUser,
    message: "User registered successfully",
  });
});

const loginUser = asyncHandler(async (req, res) => {
  // extract the login credentials from the request body
  const { email, username, password } = req.body;

  // verify that at least one identifier is provided
  if (!username && !email) {
    throw new Error("Username or email is required");
  }

  // locate the user in the database based on the provided identifier
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new Error("User does not exist");
  }

  // validate the provided password against the hashed password stored in the database
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new Error("Invalid user credentials");
  }

  // generate the JWTs for session management
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  // retrieve the user data again, excluding sensitive fields, to send back to the client
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // explicitly configure cookies for local development to prevent the browser from dropping them
  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  // attach the tokens to the cookies and send the success response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      data: { user: loggedInUser, accessToken, refreshToken },
      message: "User logged in successfully",
    });
});

const logoutUser = asyncHandler(async (req, res) => {
  // find the user by the ID attached to the request by the auth middleware and unset their refresh token
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true },
  );

  // reuse the exact permissive cookie options to successfully overwrite and delete the existing cookies
  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  // clear the cookies from the client's browser to terminate the session
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      success: true,
      message: "User logged out successfully",
    });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // return the user data that was already validated and attached by the verifyJWT middleware
  return res.status(200).json({
    success: true,
    data: req.user,
    message: "User fetched successfully",
  });
});

export { registerUser, loginUser, logoutUser, getCurrentUser };
