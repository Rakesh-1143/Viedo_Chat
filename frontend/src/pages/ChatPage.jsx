import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import toast from "react-hot-toast";
import { ArrowLeftIcon } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import {
  authorizeDirectCall,
  getDirectConversation,
  getStreamToken,
} from "../lib/api";
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import { connectStreamUser, streamClient } from "../lib/stream";
import { useVideoClient } from "../providers/videoContext";

const ChatPage = ({ id: propId }) => {
  const { id: paramsId } = useParams();
  const targetUserId = propId || paramsId;
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const { client: videoClient, error: videoError } = useVideoClient();
  const [channel, setChannel] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  const {
    data: tokenData,
    isLoading: tokenLoading,
    error: tokenError,
  } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: Boolean(authUser && streamClient),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const {
    data: conversation,
    isLoading: conversationLoading,
    error: conversationError,
  } = useQuery({
    queryKey: ["directConversation", targetUserId],
    queryFn: () => getDirectConversation(targetUserId),
    enabled: Boolean(authUser && targetUserId),
    retry: 1,
  });

  useEffect(() => {
    if (!tokenData?.token || !conversation?.channelId || !authUser || !streamClient) {
      return undefined;
    }

    let disposed = false;
    let activeChannel;
    let presenceSubscription;

    const initializeConversation = async () => {
      setChannel(null);
      setSetupError(null);

      try {
        await connectStreamUser(authUser, tokenData.token);
        activeChannel = streamClient.channel("messaging", conversation.channelId);
        await activeChannel.watch({ presence: true });

        if (disposed) return;
        const member = activeChannel.state.members?.[String(targetUserId)];
        setIsOnline(Boolean(member?.user?.online));
        setChannel(activeChannel);

        presenceSubscription = streamClient.on("user.presence.changed", (event) => {
          if (String(event.user?.id) === String(targetUserId)) {
            setIsOnline(Boolean(event.user?.online));
          }
        });
      } catch (error) {
        if (disposed) return;
        console.error("Error initializing chat", error);
        setSetupError(error);
      }
    };

    initializeConversation();

    return () => {
      disposed = true;
      presenceSubscription?.unsubscribe();
      activeChannel?.stopWatching().catch(() => undefined);
    };
  }, [authUser, conversation?.channelId, targetUserId, tokenData?.token]);

  const startCall = useCallback(
    async (mode) => {
      if (!videoClient || !channel || !authUser || !targetUserId) {
        toast.error("Calling is still connecting. Please try again in a moment.");
        return;
      }

      setPendingMode(mode);
      try {
        const callAuthorization = await authorizeDirectCall(targetUserId);
        const call = videoClient.call(
          callAuthorization.callType || "default",
          callAuthorization.callId,
        );
        const videoEnabled = mode === "video";

        await call.getOrCreate({
          ring: true,
          video: videoEnabled,
          data: {
            channel_cid: channel.cid,
            members: [
              { user_id: String(authUser._id) },
              { user_id: String(targetUserId) },
            ],
            video: videoEnabled,
            custom: {
              mode,
              channelId: channel.id,
              targetName: callAuthorization.targetUser.fullName,
              targetUserId: String(targetUserId),
            },
          },
        });

        channel
          .sendMessage({
            text: `Started a ${mode} call.`,
            call_id: callAuthorization.callId,
            call_type: callAuthorization.callType || "default",
            call_mode: mode,
          })
          .catch((error) => console.error("Could not add call activity to chat", error));

        navigate(
          `/call/${callAuthorization.callId}?type=${encodeURIComponent(
            callAuthorization.callType || "default",
          )}`,
        );
      } catch (error) {
        console.error("Failed to start call", error);
        toast.error(error.response?.data?.message || "The call could not be started.");
      } finally {
        setPendingMode(null);
      }
    },
    [authUser, channel, navigate, targetUserId, videoClient],
  );

  const queryError = tokenError || conversationError || setupError;
  const errorMessage = !streamClient
    ? "Real-time chat is not configured for this environment."
    : queryError?.response?.data?.message || queryError?.message;

  if (errorMessage) {
    return (
      <div className="conversation-state" role="alert">
        <h1>Conversation unavailable</h1>
        <p>{errorMessage}</p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (tokenLoading || conversationLoading || !channel || !streamClient) {
    return <ChatLoader />;
  }

  const targetUser = conversation.targetUser;

  return (
    <div className="chat-workspace">
      <Chat client={streamClient}>
        <Channel channel={channel}>
          <Window>
            <header className="conversation-header">
              <button
                type="button"
                className="icon-button conversation-header__back"
                onClick={() => navigate("/")}
                aria-label="Back to conversations"
                title="Back"
              >
                <ArrowLeftIcon aria-hidden="true" />
              </button>
              <div className="conversation-person">
                <div className="conversation-avatar">
                  <img src={targetUser.profilePic} alt="" />
                  <span
                    className={isOnline ? "presence-dot presence-dot--online" : "presence-dot"}
                  />
                </div>
                <div>
                  <h1>{targetUser.fullName}</h1>
                  <p>{isOnline ? "Online" : "Offline"}</p>
                </div>
              </div>
              <CallButton
                disabled={!videoClient || Boolean(videoError)}
                onStartCall={startCall}
                pendingMode={pendingMode}
              />
            </header>
            <MessageList />
            <MessageInput focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};

export default ChatPage;
