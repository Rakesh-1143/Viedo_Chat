import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import { connectStreamUser, streamClient } from "../lib/stream";

const ChatPage = ({ id: propId }) => {
  const { id: paramsId } = useParams();
  const targetUserId = propId || paramsId;

  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser || !targetUserId) return;

      try {
        await connectStreamUser(authUser, tokenData.token);

        const channelId = [authUser._id, targetUserId].sort().join("-");

        const currChannel = streamClient.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        setError(error.message || "Could not connect to chat. Please try again.");
        toast.error(error.message || "Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [tokenData, authUser, targetUserId]);

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent successfully!");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-error font-semibold">{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm">
          Retry
        </button>
      </div>
    );
  }

  if (loading || !streamClient || !channel) return <ChatLoader />;

  return (
    <div className="h-full relative flex flex-col overflow-hidden">
      <Chat client={streamClient}>
        <Channel channel={channel}>
          <div className="w-full relative flex-1 min-h-0">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput focus />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};

export default ChatPage;
