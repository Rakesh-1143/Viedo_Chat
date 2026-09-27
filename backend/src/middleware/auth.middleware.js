import jwt from "jsonwebtoken";
import User from "../models/Users.js";
import Session from "../models/Session.js";

const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No Token Provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }
    if (user.banned) {
      return res.status(403).json({ message: "This account has been suspended." });
    }

    if (decoded.jti) {
      const session = await Session.findOne({ jti: decoded.jti, revokedAt: null }).select(
        "_id lastSeenAt",
      );
      if (!session) {
        return res.status(401).json({ message: "Your session has been signed out." });
      }
      if (Date.now() - session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
        Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(
          () => undefined,
        );
      }
      req.sessionJti = decoded.jti;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }
    console.error("Error in protectRoute middleware", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const protectAdminRoute = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
