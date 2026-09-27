import { useEffect, useState } from "react";
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
import { ArrowLeftIcon, ImageIcon, InfoIcon, StarIcon, UsersIcon } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken } from "../lib/api";
import { connectStreamUser, streamClient } from "../lib/stream";
import ChatLoader from "../components/ChatLoader";
import StarredMessagesPanel from "../components/StarredMessagesPanel";
import MediaGalleryPanel from "../components/MediaGalleryPanel";
import GroupInfoPanel from "../components/GroupInfoPanel";
import ChatOptionsMenu from "../components/ChatOptionsMenu";

const GroupChatPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [channel, setChannel] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [showStarred, setShowStarred] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

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
              <ChatOptionsMenu
                items={[
                  {
                    key: "media",
                    label: "Shared media",
                    icon: ImageIcon,
                    onSelect: () => setShowMedia(true),
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
            <MessageList />
            <TypingIndicator />
            <MessageInput focus audioRecordingEnabled />
          </Window>
          <Thread />
        </Channel>
      </Chat>
      {showStarred && (
        <StarredMessagesPanel channel={channel} onClose={() => setShowStarred(false)} />
      )}
      {showMedia && <MediaGalleryPanel channel={channel} onClose={() => setShowMedia(false)} />}
      {showInfo && <GroupInfoPanel channelId={channelId} onClose={() => setShowInfo(false)} />}
    </div>
  );
};

export default GroupChatPage;
