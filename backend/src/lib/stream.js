import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

let streamClient;

if (!apiKey || !apiSecret) {
  console.error("CRITICAL: Stream API key or Secret is missing. Check your .env file.");
} else {
  try {
    streamClient = StreamChat.getInstance(apiKey, apiSecret);
  } catch (err) {
    console.error("ERROR: Failed to initialize Stream Chat client:", err.message);
  }
}

export const upsertStreamUser = async (userData) => {
  if (!streamClient) return;
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const generateStreamToken = (userId) => {
  if (!streamClient) return "";
  try {
    // ensure userId is a string
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    console.error("Error generating Stream token:", error);
    return "";
  }
};
