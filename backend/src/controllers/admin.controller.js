import mongoose from "mongoose";
import Report from "../models/Report.js";
import User from "../models/Users.js";
import Session from "../models/Session.js";

const publicProfileFields = "fullName profilePic email";

export async function getReports(req, res) {
  try {
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("reporter", publicProfileFields)
      .populate("reportedUser", `${publicProfileFields} banned`)
      .lean();

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error in getReports controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function dismissReport(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { status: "dismissed" },
      { new: true },
    );
    if (!report) return res.status(404).json({ message: "Report not found" });

    return res.status(200).json(report);
  } catch (error) {
    console.error("Error in dismissReport controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function banReportedUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    await Promise.all([
      User.findByIdAndUpdate(report.reportedUser, { banned: true }),
      Session.updateMany(
        { user: report.reportedUser, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      ),
      Report.updateMany(
        { reportedUser: report.reportedUser, status: "open" },
        { $set: { status: "actioned" } },
      ),
    ]);

    return res.status(200).json({ message: "User banned" });
  } catch (error) {
    console.error("Error in banReportedUser controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function unbanUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findByIdAndUpdate(id, { banned: false }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User unbanned" });
  } catch (error) {
    console.error("Error in unbanUser controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
