import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getFriendRequests, getStreamToken } from "../lib/api";
import { connectStreamUser, streamClient } from "../lib/stream";
import { showNotification } from "../lib/notifications";

const FRIEND_REQUEST_POLL_MS = 25_000;

export const useGlobalNotifications = (authUser) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: Boolean(authUser && streamClient),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!authUser || !tokenData?.token || !streamClient) return undefined;
    let disposed = false;

    const handleEvent = (event) => {
      if (disposed) return;
      const isMessageEvent =
        event.type === "message.new" || event.type === "notification.message_new";
      if (!isMessageEvent || String(event.user?.id) === String(authUser._id)) return;

      const channelId = event.channel_id || event.cid?.split(":")[1];
      const isGroup = Boolean(channelId?.startsWith("group-"));
      const otherUserId = isGroup
        ? null
        : channelId?.split("-").find((part) => part !== String(authUser._id));
      const chatPath = isGroup ? `/chat/group/${channelId}` : `/chat/${otherUserId}`;
      const isViewingThisChat = pathnameRef.current === chatPath;
      const isMuted = streamClient.mutedChannels?.some((mute) => mute.channel?.cid === event.cid);

      if (!isViewingThisChat && !isMuted) {
        const preview = (event.message?.text || "Sent a message").slice(0, 90);
        toast(`${event.user?.name || "New message"}: ${preview}`, { icon: "💬" });
        showNotification(event.user?.name || "New message", {
          body: preview,
          tag: `message-${channelId}`,
          onClick: () => navigate(chatPath),
        });
      }
    };

    connectStreamUser(authUser, tokenData.token)
      .then(() => {
        if (!disposed) streamClient.on(handleEvent);
      })
      .catch((error) => console.error("Notification listener setup failed", error));

    return () => {
      disposed = true;
      streamClient?.off(handleEvent);
    };
  }, [authUser, navigate, tokenData?.token]);

  const previousIncomingCount = useRef(null);
  const previousAcceptedCount = useRef(null);

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: Boolean(authUser),
    refetchInterval: FRIEND_REQUEST_POLL_MS,
  });

  useEffect(() => {
    if (!friendRequests) return;
    const incoming = friendRequests.incomingReqs || [];
    const accepted = friendRequests.acceptedReqs || [];

    if (
      previousIncomingCount.current !== null &&
      incoming.length > previousIncomingCount.current
    ) {
      const senderName = incoming[0]?.sender?.fullName || "Someone";
      toast.success(`${senderName} sent you a friend request`);
      showNotification(senderName, {
        body: "Sent you a friend request",
        tag: "friend-request",
        onClick: () => navigate("/notifications"),
      });
    }
    if (
      previousAcceptedCount.current !== null &&
      accepted.length > previousAcceptedCount.current
    ) {
      const recipientName = accepted[0]?.recipient?.fullName || "Someone";
      toast.success(`${recipientName} accepted your friend request`);
      showNotification(recipientName, {
        body: "Accepted your friend request",
        tag: "friend-accepted",
        onClick: () => navigate("/notifications"),
      });
    }

    previousIncomingCount.current = incoming.length;
    previousAcceptedCount.current = accepted.length;
  }, [friendRequests, navigate]);
};

export default useGlobalNotifications;
