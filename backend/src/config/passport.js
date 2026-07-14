import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "../models/user.model.js";

// Helper to handle the OAuth verify callback logic
const handleOAuthUser = async (provider, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0].value;
    if (!email) {
      return done(new Error("No email found from OAuth provider"), null);
    }

    let user = await User.findOne({ email });

    if (user) {
      // If user exists but was created via local auth (no providerId), 
      // or a different provider, we just log them in for now.
      // Ideally, you'd link accounts if you want to be robust.
      if (!user.providerId) {
        user.provider = provider;
        user.providerId = profile.id;
        await user.save({ validateBeforeSave: false });
      }
      return done(null, user);
    } else {
      // Generate a unique username if necessary
      const baseUsername = profile.username || email.split("@")[0];
      const randomSuffix = Math.floor(Math.random() * 10000);
      const uniqueUsername = `${baseUsername}${randomSuffix}`;

      user = await User.create({
        username: uniqueUsername,
        email,
        provider,
        providerId: profile.id,
      });

      return done(null, user);
    }
  } catch (error) {
    return done(error, null);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_GOOGLE_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_GOOGLE_SECRET",
      callbackURL: `${process.env.CORS_ORIGIN || "http://localhost:5173"}/api/v1/users/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      handleOAuthUser("google", profile, done);
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "PLACEHOLDER_GITHUB_ID",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "PLACEHOLDER_GITHUB_SECRET",
      callbackURL: `${process.env.CORS_ORIGIN || "http://localhost:5173"}/api/v1/users/auth/github/callback`,
      scope: ["user:email"], // ensure we can read the email
    },
    (accessToken, refreshToken, profile, done) => {
      handleOAuthUser("github", profile, done);
    }
  )
);

// We serialize the whole user object or just ID. 
// Since we are primarily using JWTs for our API, we only need a lightweight session during the OAuth handshake.
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
