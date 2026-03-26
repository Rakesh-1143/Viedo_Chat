import mongoose from "mongoose";

export default async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log("Mongodb connected", conn.connection.host);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}
