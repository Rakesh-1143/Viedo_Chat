import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
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
  ImageIcon,
  InfoIcon,
  PaletteIcon,
  PinIcon,
  PinOffIcon,
  SearchIcon,
  StarIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { authorizeGroupCall, getStreamToken, logCallStart } from "../lib/api";
import { connectStreamUser, streamClient } from "../lib/stream";
import { getCallErrorMessage } from "../lib/call";
import { getWallpaper, setWallpaper } from "../lib/wallpaper";
import { useConversationActions } from "../hooks/useConversationActions";
import { useVideoClient } from "../providers/videoContext";
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import StarredMessagesPanel from "../components/StarredMessagesPanel";
import MediaGalleryPanel from "../components/MediaGalleryPanel";
import GroupInfoPanel from "../components/GroupInfoPanel";
import ChatSearchPanel from "../components/ChatSearchPanel";
import ChatOptionsMenu from "../components/ChatOptionsMenu";
import WallpaperPicker from "../components/WallpaperPicker";
import ForwardMessageDialog from "../components/ForwardMessageDialog";
import ScheduledMessagesPanel from "../components/ScheduledMessagesPanel";
import DisappearingMessagesDialog from "../components/DisappearingMessagesDialog";
import WhatsAppMessageStatus from "../components/WhatsAppMessageStatus";

const GroupChatPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const { client: videoClient, error: videoError, isReady: videoReady } = useVideoClient();
  const [channel, setChannel] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [showStarred, setShowStarred] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
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
  const [pendingMode, setPendingMode] = useState(null);
  const { isPinned, isMuted, togglePin, toggleMute, archiveConversation, exportHistory } =
    useConversationActions(channel);

  useEffect(() => {
    if (channel) setWallpaperState(getWallpaper(channel.id));
  }, [channel]);

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

  useEffect(() => {
    if (!tokenData?.token || !authUser || !streamClient || !channelId) return undefined;

    let disposed = false;
    let activeChannel;

    const init = async () => {
      setChannel(null);
      setSetupError(null);
      try {
        await connectStreamUser(authUser, tokenData.token);
        activeChannel = streamClient.channel("messaging", channelId);
        await activeChannel.watch();
        if (disposed) return;
        setChannel(activeChannel);
      } catch (error) {
        if (disposed) return;
        console.error("Error opening group chat", error);
        setSetupError(error);
      }
    };

    init();

    return () => {
      disposed = true;
      activeChannel?.stopWatching().catch(() => undefined);
    };
  }, [authUser, channelId, tokenData?.token]);

  const startCall = useCallback(
    async (mode) => {
      if (!videoClient || !channel || !authUser) {
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
        const callAuthorization = await authorizeGroupCall(channelId);
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
            members: callAuthorization.memberIds.map((id) => ({ user_id: id })),
            video: videoEnabled,
            custom: {
              mode,
              channelId: callAuthorization.channelId,
              targetName: callAuthorization.groupName,
              isGroupCall: true,
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
          channelId: callAuthorization.channelId,
          mode,
          isGroupCall: true,
        }).catch((error) => console.error("Could not log call history", error));

        navigate(
          `/call/${callAuthorization.callId}?type=${encodeURIComponent(
            callAuthorization.callType || "default",
          )}`,
        );
      } catch (error) {
        console.error("Failed to start group call", error);
        toast.error(error.response?.data?.message || getCallErrorMessage(error));
      } finally {
        setPendingMode(null);
      }
    },
    [authUser, channel, channelId, navigate, videoClient, videoReady, videoError],
  );

  const queryError = tokenError || setupError;
  const errorMessage = !streamClient
    ? "Real-time chat is not configured for this environment."
    : queryError
      ? "This group is unavailable, or you're no longer a member."
      : null;

  if (errorMessage) {
    return (
      <div className="conversation-state" role="alert">
        <h1>Group unavailable</h1>
        <p>{errorMessage}</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/")}>
          Back to conversations
        </button>
      </div>
    );
  }

  if (tokenLoading || !channel) {
    return <ChatLoader />;
  }

  const memberCount = Object.keys(channel.state.members || {}).length;
  const groupName = channel.data?.name || "Group";

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
                <div className="conversation-avatar conversation-avatar--group">
                  <UsersIcon aria-hidden="true" />
                </div>
                <div>
                  <h1>{groupName}</h1>
                  <p>{memberCount} members</p>
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
                    onSelect: () => exportHistory(groupName),
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
                    key: "info",
                    label: "Group info",
                    icon: InfoIcon,
                    onSelect: () => setShowInfo(true),
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
      {showInfo && <GroupInfoPanel channelId={channelId} onClose={() => setShowInfo(false)} />}
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

export default GroupChatPage;
