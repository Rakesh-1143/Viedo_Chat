import { useCallback, useState } from "react";
import toast from "react-hot-toast";

const MAX_EXPORT_MESSAGES = 500;
const EXPORT_PAGE_SIZE = 100;

const formatExportLine = (message) => {
  const when = new Date(message.created_at).toLocaleString();
  const author = message.user?.name || message.user?.id || "Unknown";
  const text = message.text || (message.attachments?.length ? "[attachment]" : "");
  return `[${when}] ${author}: ${text}`;
};

export const useConversationActions = (channel) => {
  // Tracks a locally-applied pin/mute override so the UI updates instantly
  // after a toggle, without needing an effect to sync from `channel`.
  const [override, setOverride] = useState(null);

  const basePinned = Boolean(channel?.state.membership?.pinned_at);
  const baseMuted = Boolean(channel?.muteStatus?.().muted);
  const hasOverride = Boolean(channel) && override?.channelId === channel.id;
  const isPinned = hasOverride ? override.pinned : basePinned;
  const isMuted = hasOverride ? override.muted : baseMuted;

  const togglePin = useCallback(async () => {
    if (!channel) return;
    try {
      if (isPinned) await channel.unpin();
      else await channel.pin();
      setOverride({ channelId: channel.id, pinned: !isPinned, muted: isMuted });
      toast.success(isPinned ? "Unpinned" : "Pinned to top");
    } catch (error) {
      console.error("Failed to toggle pin", error);
      toast.error("Could not update pin");
    }
  }, [channel, isPinned, isMuted]);

  const toggleMute = useCallback(async () => {
    if (!channel) return;
    try {
      if (isMuted) await channel.unmute();
      else await channel.mute();
      setOverride({ channelId: channel.id, pinned: isPinned, muted: !isMuted });
      toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
    } catch (error) {
      console.error("Failed to toggle mute", error);
      toast.error("Could not update notification settings");
    }
  }, [channel, isMuted, isPinned]);

  const archiveConversation = useCallback(
    async (onArchived) => {
      if (!channel) return;
      try {
        await channel.archive();
        toast.success("Conversation archived");
        onArchived?.();
      } catch (error) {
        console.error("Failed to archive conversation", error);
        toast.error("Could not archive this conversation");
      }
    },
    [channel],
  );

  const exportHistory = useCallback(
    async (fileName) => {
      if (!channel) return;
      try {
        let messages = [...(channel.state.messages || [])];
        let oldestId = messages[0]?.id;
        let fetched = messages.length;

        while (oldestId && fetched < MAX_EXPORT_MESSAGES) {
          const response = await channel.query({
            messages: { limit: EXPORT_PAGE_SIZE, id_lt: oldestId },
          });
          if (!response.messages?.length) break;
          messages = [...response.messages, ...messages];
          fetched += response.messages.length;
          oldestId = response.messages[0]?.id;
          if (response.messages.length < EXPORT_PAGE_SIZE) break;
        }

        const text = messages.map(formatExportLine).join("\n");
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName || "conversation"}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("Conversation exported");
      } catch (error) {
        console.error("Failed to export conversation", error);
        toast.error("Could not export this conversation");
      }
    },
    [channel],
  );

  return { isPinned, isMuted, togglePin, toggleMute, archiveConversation, exportHistory };
};

export default useConversationActions;
