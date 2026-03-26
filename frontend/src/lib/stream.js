import { StreamChat } from "stream-chat";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

if (!STREAM_API_KEY) {
  console.error("CRITICAL: VITE_STREAM_API_KEY is missing. Check your frontend/.env file and restart the dev server.");
}

export const streamClient = STREAM_API_KEY ? StreamChat.getInstance(STREAM_API_KEY) : null;

let connectingPromise = null;

export const connectStreamUser = async (user, token) => {
  if (!streamClient) return null;

  // If already connecting, return the existing promise
  if (connectingPromise) {
    console.log("Already connecting to Stream, waiting...");
    return connectingPromise;
  }

  // If already connected as the correct user, return the client
  if (streamClient.userID === String(user._id)) {
    return streamClient;
  }

  connectingPromise = (async () => {
    try {
      console.log(`Connecting user ${user._id} to Stream...`);
      
      if (streamClient.userID) {
        console.log("Disconnecting existing Stream user:", streamClient.userID);
        await streamClient.disconnectUser();
      }

      // If the image is a base64 string, it can make the WS handshake URL too long
      const image = user.profilePic?.startsWith("data:") ? "" : user.profilePic;

      await streamClient.connectUser(
        {
          id: String(user._id),
          name: user.fullName || "Anonymous",
          image: image || "",
        },
        token
      );
      
      console.log("Successfully connected to Stream!");
      return streamClient;
    } catch (error) {
      console.error("Failed to connect user to Stream:", error);
      throw error;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};
