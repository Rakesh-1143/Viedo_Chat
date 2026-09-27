import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ForwardIcon, UsersIcon, XIcon } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { getDirectConversation, getUserFriends } from "../lib/api";
import { streamClient } from "../lib/stream";

const ForwardMessageDialog = ({ message, onClose }) => {
  const { authUser } = useAuthUser();
  const [groups, setGroups] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  useEffect(() => {
    let cancelled = false;
    streamClient
      .queryChannels(
        { type: "messaging", members: { $in: [String(authUser._id)] }, archived: false },
        [{ last_message_at: -1 }],
        { state: true, watch: false },
      )
      .then((channels) => {
        if (cancelled) return;
        setGroups(
          channels
            .filter((c) => c.data?.is_group)
            .map((c) => ({ id: c.id, name: c.data?.name || "Group" })),
        );
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser._id]);

  const handleSend = async () => {
    if (!selectedTarget) return;
    setIsSending(true);
    try {
      let channelId = selectedTarget.channelId;
      if (selectedTarget.type === "friend") {
        const conversation = await getDirectConversation(selectedTarget.id);
        channelId = conversation.channelId;
      }
      const targetChannel = streamClient.channel("messaging", channelId);
      await targetChannel.sendMessage({
        text: message.text,
        attachments: message.attachments,
      });
      toast.success(`Forwarded to ${selectedTarget.name}`);
      onClose();
    } catch (error) {
      console.error("Failed to forward message", error);
      toast.error("Could not forward this message");
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Forward message">
      <button type="button" className="app-dialog__backdrop" onClick={onClose} aria-label="Close" />
      <div className="app-dialog__box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ForwardIcon className="size-5 text-primary" aria-hidden="true" />
            Forward message
          </h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm opacity-70 mb-3 line-clamp-2">
          &quot;{message.text || "Attachment"}&quot;
        </p>

        {friendsLoading || groups === null ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 border border-base-300 rounded-lg p-2">
            {groups.map((group) => {
              const isSelected =
                selectedTarget?.type === "group" && selectedTarget.channelId === group.id;
              return (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="forward-target"
                    className="radio radio-sm radio-primary"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedTarget({ type: "group", channelId: group.id, name: group.name })
                    }
                  />
                  <div className="conversation-avatar conversation-avatar--group size-8 shrink-0">
                    <UsersIcon className="size-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium truncate min-w-0 flex-1">{group.name}</span>
                </label>
              );
            })}
            {friends.map((friend) => {
              const isSelected = selectedTarget?.type === "friend" && selectedTarget.id === friend._id;
              return (
                <label
                  key={friend._id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="forward-target"
                    className="radio radio-sm radio-primary"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedTarget({ type: "friend", id: friend._id, name: friend.fullName })
                    }
                  />
                  <div className="avatar size-8 rounded-full overflow-hidden bg-base-300 shrink-0">
                    <img src={friend.profilePic} alt="" />
                  </div>
                  <span className="text-sm font-medium truncate min-w-0 flex-1">
                    {friend.fullName}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedTarget || isSending}
            onClick={handleSend}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ForwardMessageDialog;
