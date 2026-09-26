import mongoose from "mongoose";

export default async function connectDB() {
  try {
    const configuredPoolSize = Number.parseInt(process.env.MONGO_MAX_POOL_SIZE, 10);
    const maxPoolSize =
      Number.isFinite(configuredPoolSize) && configuredPoolSize > 0
        ? Math.min(configuredPoolSize, 50)
        : 10;
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      maxPoolSize,
      serverSelectionTimeoutMS: 10_000,
    });
    console.log("Mongodb connected", conn.connection.host);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
}
