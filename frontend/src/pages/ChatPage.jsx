import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  TypingIndicator,
  Window,
} from "stream-chat-react";
import toast from "react-hot-toast";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BellIcon,
  BellOffIcon,
  ClockIcon,
  DownloadIcon,
  FlagIcon,
  ImageIcon,
  PaletteIcon,
  PinIcon,
  PinOffIcon,
  SearchIcon,
  ShieldBanIcon,
  StarIcon,
  TimerIcon,
} from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import {
  authorizeDirectCall,
  blockUser,
  getDirectConversation,
  getStreamToken,
  logCallStart,
} from "../lib/api";
import { formatLastSeen } from "../lib/utils";
import { getCallErrorMessage } from "../lib/call";
import { getWallpaper, setWallpaper } from "../lib/wallpaper";
import { useConversationActions } from "../hooks/useConversationActions";
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import StarredMessagesPanel from "../components/StarredMessagesPanel";
import MediaGalleryPanel from "../components/MediaGalleryPanel";
import ChatSearchPanel from "../components/ChatSearchPanel";
import ChatOptionsMenu from "../components/ChatOptionsMenu";
import ReportUserDialog from "../components/ReportUserDialog";
import WallpaperPicker from "../components/WallpaperPicker";
import ForwardMessageDialog from "../components/ForwardMessageDialog";
import ScheduledMessagesPanel from "../components/ScheduledMessagesPanel";
import DisappearingMessagesDialog from "../components/DisappearingMessagesDialog";
import WhatsAppMessageStatus from "../components/WhatsAppMessageStatus";
import { connectStreamUser, streamClient } from "../lib/stream";
import { useVideoClient } from "../providers/videoContext";

const ChatPage = ({ id: propId }) => {
  const { id: paramsId } = useParams();
  const targetUserId = propId || paramsId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { client: videoClient, error: videoError, isReady: videoReady } = useVideoClient();
  const [channel, setChannel] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);
  const [showStarred, setShowStarred] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [wallpaper, setWallpaperState] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showScheduled, setShowScheduled] = useState(false);
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState(0);

  useEffect(() => {
    if (channel) setDisappearingDuration(channel.data?.disappearing_duration_seconds || 0);
  }, [channel]);
  const { isPinned, isMuted, togglePin, toggleMute, archiveConversation, exportHistory } =
    useConversationActions(channel);

  useEffect(() => {
    if (channel) setWallpaperState(getWallpaper(channel.id));
  }, [channel]);

  const { mutate: blockMutation } = useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      toast.success("User blocked");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      navigate("/");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not block this user");
    },
  });

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
        setLastActiveAt(member?.user?.last_active || null);
        setChannel(activeChannel);

        presenceSubscription = streamClient.on("user.presence.changed", (event) => {
          if (String(event.user?.id) === String(targetUserId)) {
            setIsOnline(Boolean(event.user?.online));
            setLastActiveAt(event.user?.last_active || null);
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
      if (videoError) {
        toast.error(getCallErrorMessage(videoError));
        return;
      }
      if (!videoReady) {
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

        logCallStart({
          callId: callAuthorization.callId,
          channelId: channel.cid,
          calleeId: String(targetUserId),
          mode,
        }).catch((error) => console.error("Could not log call history", error));

        navigate(
          `/call/${callAuthorization.callId}?type=${encodeURIComponent(
            callAuthorization.callType || "default",
          )}`,
        );
      } catch (error) {
        console.error("Failed to start call", error);
        toast.error(error.response?.data?.message || getCallErrorMessage(error));
      } finally {
        setPendingMode(null);
      }
    },
    [authUser, channel, navigate, targetUserId, videoClient, videoReady, videoError],
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
    <div className="chat-workspace" style={{ "--chat-wallpaper": wallpaper || undefined }}>
      <Chat client={streamClient}>
        <Channel channel={channel} MessageStatus={WhatsAppMessageStatus}>
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
                  <p>{isOnline ? "Online" : lastActiveAt ? formatLastSeen(lastActiveAt) : "Offline"}</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowStarred(true)}
                aria-label="Starred messages"
                title="Starred messages"
              >
                <StarIcon aria-hidden="true" />
              </button>
              <CallButton
                disabled={!videoClient || (!videoReady && !videoError)}
                disabledReason={
                  !videoClient || (!videoReady && !videoError) ? "Connecting..." : null
                }
                onStartCall={startCall}
                pendingMode={pendingMode}
              />
              <ChatOptionsMenu
                items={[
                  {
                    key: "search",
                    label: "Search messages",
                    icon: SearchIcon,
                    onSelect: () => setShowSearch(true),
                  },
                  {
                    key: "media",
                    label: "Shared media",
                    icon: ImageIcon,
                    onSelect: () => setShowMedia(true),
                  },
                  {
                    key: "pin",
                    label: isPinned ? "Unpin conversation" : "Pin conversation",
                    icon: isPinned ? PinOffIcon : PinIcon,
                    onSelect: togglePin,
                  },
                  {
                    key: "mute",
                    label: isMuted ? "Unmute notifications" : "Mute notifications",
                    icon: isMuted ? BellIcon : BellOffIcon,
                    onSelect: toggleMute,
                  },
                  {
                    key: "wallpaper",
                    label: "Chat wallpaper",
                    icon: PaletteIcon,
                    onSelect: () => setShowWallpaper(true),
                  },
                  {
                    key: "export",
                    label: "Export conversation",
                    icon: DownloadIcon,
                    onSelect: () => exportHistory(targetUser.fullName),
                  },
                  {
                    key: "scheduled",
                    label: "Scheduled messages",
                    icon: ClockIcon,
                    onSelect: () => setShowScheduled(true),
                  },
                  {
                    key: "disappearing",
                    label: "Disappearing messages",
                    icon: TimerIcon,
                    onSelect: () => setShowDisappearing(true),
                  },
                  {
                    key: "archive",
                    label: "Archive conversation",
                    icon: ArchiveIcon,
                    onSelect: () => archiveConversation(() => navigate("/")),
                  },
                  {
                    key: "report",
                    label: "Report user",
                    icon: FlagIcon,
                    onSelect: () => setShowReport(true),
                  },
                  {
                    key: "block",
                    label: "Block user",
                    icon: ShieldBanIcon,
                    danger: true,
                    onSelect: () => {
                      if (
                        window.confirm(
                          `Block ${targetUser.fullName}? They won't be able to message you.`,
                        )
                      ) {
                        blockMutation(targetUser._id);
                      }
                    },
                  },
                ]}
              />
            </header>
            <MessageList
              returnAllReadData
              customMessageActions={{
                Forward: (message) => setForwardMessage(message),
              }}
            />
            <TypingIndicator />
            <MessageInput focus audioRecordingEnabled />
            {showSearch && (
              <ChatSearchPanel channel={channel} onClose={() => setShowSearch(false)} />
            )}
          </Window>
          <Thread />
        </Channel>
      </Chat>
      {showStarred && (
        <StarredMessagesPanel channel={channel} onClose={() => setShowStarred(false)} />
      )}
      {showMedia && <MediaGalleryPanel channel={channel} onClose={() => setShowMedia(false)} />}
      {showReport && (
        <ReportUserDialog
          targetUserId={targetUser._id}
          targetName={targetUser.fullName}
          onClose={() => setShowReport(false)}
        />
      )}
      {showWallpaper && (
        <WallpaperPicker
          current={wallpaper}
          onSelect={(value) => {
            setWallpaperState(value);
            setWallpaper(channel.id, value);
            setShowWallpaper(false);
          }}
          onClose={() => setShowWallpaper(false)}
        />
      )}
      {forwardMessage && (
        <ForwardMessageDialog
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
        />
      )}
      {showScheduled && (
        <ScheduledMessagesPanel channelId={channel.id} onClose={() => setShowScheduled(false)} />
      )}
      {showDisappearing && (
        <DisappearingMessagesDialog
          channelId={channel.id}
          current={disappearingDuration}
          onUpdated={setDisappearingDuration}
          onClose={() => setShowDisappearing(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;
