import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ClockIcon, XIcon } from "lucide-react";
import {
  cancelScheduledMessage,
  createScheduledMessage,
  getScheduledMessages,
} from "../lib/api";
import useEscapeKey from "../hooks/useEscapeKey";

const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const ScheduledMessagesPanel = ({ channelId, onClose }) => {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sendAt, setSendAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [minSendAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 1000)));

  const { data: scheduled = [], isLoading } = useQuery({
    queryKey: ["scheduledMessages", channelId],
    queryFn: () => getScheduledMessages(channelId),
  });

  const { mutate: scheduleMutation, isPending: isScheduling } = useMutation({
    mutationFn: () =>
      createScheduledMessage({
        channelId,
        text: text.trim(),
        sendAt: new Date(sendAt).toISOString(),
      }),
    onSuccess: () => {
      toast.success("Message scheduled");
      setText("");
      queryClient.invalidateQueries({ queryKey: ["scheduledMessages", channelId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not schedule this message");
    },
  });

  const { mutate: cancelMutation } = useMutation({
    mutationFn: cancelScheduledMessage,
    onSuccess: () => {
      toast.success("Scheduled message canceled");
      queryClient.invalidateQueries({ queryKey: ["scheduledMessages", channelId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not cancel this message");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Write a message to schedule");
      return;
    }
    scheduleMutation();
  };

  return createPortal(
    <div className="starred-panel" role="dialog" aria-modal="true" aria-label="Scheduled messages">
      <button
        type="button"
        className="starred-panel__backdrop"
        onClick={onClose}
        aria-label="Close scheduled messages"
      />
      <aside className="starred-panel__content">
        <header className="starred-panel__header">
          <h2>Scheduled messages</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </header>

        <div className="media-gallery__body">
          <form onSubmit={handleSubmit} className="space-y-3 mb-4">
            <textarea
              className="textarea textarea-bordered w-full h-20"
              placeholder="Write a message to send later..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5000}
            />
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={sendAt}
              min={minSendAt}
              onChange={(e) => setSendAt(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm w-full" disabled={isScheduling}>
              {isScheduling ? "Scheduling..." : "Schedule"}
            </button>
          </form>

          <h4 className="text-sm font-semibold opacity-70 mb-2">Pending</h4>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner" />
            </div>
          ) : scheduled.length === 0 ? (
            <p className="starred-panel__empty">No messages scheduled yet.</p>
          ) : (
            <ul className="starred-panel__list">
              {scheduled.map((item) => (
                <li key={item._id} className="starred-panel__item">
                  <div className="starred-panel__meta">
                    <span className="starred-panel__author flex items-center gap-1.5">
                      <ClockIcon className="size-3" aria-hidden="true" />
                      {new Date(item.sendAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="starred-panel__text">{item.text}</p>
                  <button
                    type="button"
                    className="starred-panel__unstar"
                    onClick={() => cancelMutation(item._id)}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default ScheduledMessagesPanel;
