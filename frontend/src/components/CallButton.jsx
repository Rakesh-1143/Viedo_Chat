import { PhoneIcon, VideoIcon } from "lucide-react";

const CallButton = ({ disabled, onStartCall, pendingMode }) => (
  <div className="conversation-call-actions" aria-label="Call options">
    <button
      type="button"
      className="icon-button"
      onClick={() => onStartCall("audio")}
      disabled={disabled || Boolean(pendingMode)}
      aria-label="Start audio call"
      title="Start audio call"
    >
      {pendingMode === "audio" ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <PhoneIcon aria-hidden="true" />
      )}
    </button>
    <button
      type="button"
      className="icon-button icon-button--primary"
      onClick={() => onStartCall("video")}
      disabled={disabled || Boolean(pendingMode)}
      aria-label="Start video call"
      title="Start video call"
    >
      {pendingMode === "video" ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <VideoIcon aria-hidden="true" />
      )}
    </button>
  </div>
);

export default CallButton;
