import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { TimerIcon, XIcon } from "lucide-react";
import { setDisappearingMessages } from "../lib/api";

const OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1 hour", value: 3_600 },
  { label: "24 hours", value: 86_400 },
  { label: "7 days", value: 604_800 },
];

const DisappearingMessagesDialog = ({ channelId, current, onUpdated, onClose }) => {
  const [selected, setSelected] = useState(current || 0);

  const { mutate: saveMutation, isPending } = useMutation({
    mutationFn: () => setDisappearingMessages(channelId, selected),
    onSuccess: () => {
      toast.success(selected === 0 ? "Disappearing messages turned off" : "Disappearing messages enabled");
      onUpdated?.(selected);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update this setting");
    },
  });

  return createPortal(
    <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Disappearing messages">
      <button type="button" className="app-dialog__backdrop" onClick={onClose} aria-label="Close" />
      <div className="app-dialog__box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TimerIcon className="size-5 text-primary" aria-hidden="true" />
            Disappearing messages
          </h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm opacity-70 mb-4">
          New messages sent after this is turned on will be automatically deleted for everyone
          once they're older than the chosen duration.
        </p>

        <div className="space-y-1 mb-4">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
            >
              <input
                type="radio"
                name="disappearing-duration"
                className="radio radio-sm radio-primary"
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => saveMutation()}
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DisappearingMessagesDialog;
