import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getFriendRequests, getStreamToken } from "../lib/api";
import { connectStreamUser, streamClient } from "../lib/stream";

const FRIEND_REQUEST_POLL_MS = 25_000;

export const useGlobalNotifications = (authUser) => {
  const location = useLocation();
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
      const otherUserId = channelId
        ?.split("-")
        .find((part) => part !== String(authUser._id));
      const isViewingThisChat =
        otherUserId && pathnameRef.current === `/chat/${otherUserId}`;

      if (!isViewingThisChat) {
        const preview = (event.message?.text || "Sent a message").slice(0, 90);
        toast(`${event.user?.name || "New message"}: ${preview}`, { icon: "💬" });
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
  }, [authUser, tokenData?.token]);

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
      toast.success(`${incoming[0]?.sender?.fullName || "Someone"} sent you a friend request`);
    }
    if (
      previousAcceptedCount.current !== null &&
      accepted.length > previousAcceptedCount.current
    ) {
      toast.success(
        `${accepted[0]?.recipient?.fullName || "Someone"} accepted your friend request`,
      );
    }

    previousIncomingCount.current = incoming.length;
    previousAcceptedCount.current = accepted.length;
  }, [friendRequests]);
};

export default useGlobalNotifications;
