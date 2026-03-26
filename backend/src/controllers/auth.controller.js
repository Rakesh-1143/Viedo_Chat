import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/Users.js";
import jwt from "jsonwebtoken";

export async function signup(req, res) {
  const { fullName, email, password, phoneNumber } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const randomAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&size=128`;

    const newUser = await User.create({
      email,
      fullName,
      password,
      phoneNumber: phoneNumber || "",
      profilePic: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.profilePic || "",
      });
      console.log(`Stream user created for ${newUser.fullName}`);
    } catch (error) {
      console.log("Error creating stream user:", error);
    }

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    console.log("error in signup controller: " + err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    try {
      await upsertStreamUser({
        id: user._id.toString(),
        name: user.fullName,
        image: user.profilePic || "",
      });
    } catch (error) {
      console.log("Error syncing user to Stream during login:", error);
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in login Controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout Successfully" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const {
      fullName,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      profilePic,
      phoneNumber,
    } = req.body;

    if (!fullName || !bio || !nativeLanguage || !learningLanguage) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
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
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    } catch (error) {
      console.log("Error updating stream user during onboarding:", error);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.log("Error in onboarding controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteAccount(req, res) {
  try {
    const userId = req.user._id;

    await User.findByIdAndDelete(userId);

    res.clearCookie("jwt");

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAccount controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);

    // Check if current password is correct
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    // Update password (will be hashed by pre-save hook in model)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("Error in updatePassword controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
