import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

let streamClient;

if (apiKey && apiSecret) {
  try {
    streamClient = StreamChat.getInstance(apiKey, apiSecret);
  } catch (err) {
    console.error("ERROR: Failed to initialize Stream Chat client:", err.message);
  }
}

export const upsertStreamUser = async (userData) => {
  if (!streamClient) throw new Error("Stream service is not configured");
  await streamClient.upsertUsers([userData]);
  return userData;
};

export const generateStreamToken = (userId) => {
  if (!streamClient) throw new Error("Stream service is not configured");
  return streamClient.createToken(userId.toString());
};

export const createDirectChannel = async (channelId, memberIds, createdBy) => {
  if (!streamClient) throw new Error("Stream service is not configured");
  const channel = streamClient.channel("messaging", channelId, {
    members: memberIds.map(String),
    created_by_id: String(createdBy),
  });
  await channel.create();
  return channel;
};

export const createGroupChannel = async (channelId, memberIds, { name, createdBy }) => {
  if (!streamClient) throw new Error("Stream service is not configured");
  const channel = streamClient.channel("messaging", channelId, {
    members: memberIds.map(String),
    name,
    created_by_id: String(createdBy),
    is_group: true,
  });
  await channel.create();
  return channel;
};

export const getGroupChannel = async (channelId) => {
  if (!streamClient) throw new Error("Stream service is not configured");
  if (!channelId.startsWith("group-")) return null;
  const channel = streamClient.channel("messaging", channelId);
  await channel.watch();
  if (!channel.data?.is_group) return null;
  return channel;
};

export const getMemberChannel = async (channelId, userId) => {
  if (!streamClient) throw new Error("Stream service is not configured");
  const channel = streamClient.channel("messaging", channelId);
  await channel.watch();
  const memberIds = Object.keys(channel.state.members || {});
  if (!memberIds.includes(String(userId))) return null;
  return channel;
};

export const deleteStreamUser = async (userId) => {
  if (!streamClient) return;
  await streamClient.deleteUser(String(userId), {
    delete_conversation_channels: true,
    mark_messages_deleted: true,
  });
};

export const isStreamConfigured = () => Boolean(streamClient);

export const getStreamClient = () => {
  if (!streamClient) throw new Error("Stream service is not configured");
  return streamClient;
};
