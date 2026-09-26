import User from "../models/Users.js";
import FriendRequest from "../models/FriendRequest.js";
import { deleteStreamUser, upsertStreamUser } from "../lib/stream.js";
import { clearAuthCookie, issueAuthCookie } from "../utils/auth.js";
import {
  cleanText,
  normalizeEmail,
  normalizeLanguage,
  validateEmail,
  validateLanguage,
  validatePassword,
  validatePhoneNumber,
  validateProfilePicture,
} from "../utils/validation.js";

const publicUser = (user) => user.toJSON();

export async function signup(req, res) {
  const fullName = cleanText(req.body.fullName, 80);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  const phoneNumber = cleanText(req.body.phoneNumber, 24);

  try {
    if (fullName.length < 2 || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be 8-128 characters and include a letter and number",
      });
    }
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }

    const existingUser = await User.exists({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account already exists with this email" });
    }

    const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563eb&color=fff&size=128`;
    const newUser = await User.create({
      email,
      fullName,
      password,
      phoneNumber,
      profilePic,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.profilePic,
      });
    } catch (error) {
      console.error("Failed to create Stream user", error.message);
    }

    issueAuthCookie(res, newUser._id);
    return res.status(201).json({ success: true, user: publicUser(newUser) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "An account already exists with this email" });
    }
    console.error("Error in signup controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!validateEmail(email) || typeof password !== "string") {
      return res.status(400).json({ message: "Enter your email and password" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    try {
      await upsertStreamUser({
        id: user._id.toString(),
        name: user.fullName,
        image: user.profilePic || "",
      });
    } catch (error) {
      console.error("Failed to sync Stream user", error.message);
    }

    issueAuthCookie(res, user._id);
    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("Error in login controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: "Signed out successfully" });
}

export async function onboard(req, res) {
  try {
    const fullName = cleanText(req.body.fullName, 80);
    const bio = cleanText(req.body.bio, 500);
    const nativeLanguage = normalizeLanguage(req.body.nativeLanguage);
    const learningLanguage = normalizeLanguage(req.body.learningLanguage);
    const location = cleanText(req.body.location, 120);
    const phoneNumber = cleanText(req.body.phoneNumber, 24);
    const profilePic =
      typeof req.body.profilePic === "string" ? req.body.profilePic.trim() : "";

    if (fullName.length < 2 || !bio || !location) {
      return res.status(400).json({ message: "Name, bio, and location are required" });
    }
    if (!validateLanguage(nativeLanguage) || !validateLanguage(learningLanguage)) {
      return res.status(400).json({ message: "Select a supported language" });
    }
    if (nativeLanguage === learningLanguage) {
      return res.status(400).json({ message: "Choose two different languages" });
    }
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }
    if (!validateProfilePicture(profilePic)) {
      return res.status(400).json({ message: "Use a valid HTTPS image or upload under 2 MB" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        fullName,
        bio,
        nativeLanguage,
        learningLanguage,
        location,
        profilePic,
        phoneNumber,
        isOnboarding: true,
      },
      { new: true, runValidators: true },
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    } catch (error) {
      console.error("Failed to update Stream user", error.message);
    }

    return res.status(200).json({ success: true, user: publicUser(updatedUser) });
  } catch (error) {
    console.error("Error in onboarding controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteAccount(req, res) {
  const userId = req.user._id;
  try {
    await Promise.all([
      User.updateMany({ friends: userId }, { $pull: { friends: userId } }),
      FriendRequest.deleteMany({
        $or: [{ sender: userId }, { recipient: userId }],
      }),
    ]);

    await User.findByIdAndDelete(userId);
    try {
      await deleteStreamUser(userId);
    } catch (error) {
      console.error("Failed to delete Stream user data", error.message);
    }

    clearAuthCookie(res);
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAccount controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || !validatePassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be 8-128 characters and include a letter and number",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Choose a different new password" });
    }

    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in updatePassword controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
