import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StarIcon, XIcon } from "lucide-react";

const StarredMessagesPanel = ({ channel, onClose }) => {
  const [pinned, setPinned] = useState([]);

  useEffect(() => {
    if (!channel) return undefined;

    const refresh = () => setPinned([...(channel.state.pinnedMessages || [])]);
    refresh();

    channel.on("message.updated", refresh);
    channel.on("message.deleted", refresh);
    return () => {
      channel.off("message.updated", refresh);
      channel.off("message.deleted", refresh);
    };
  }, [channel]);

  const unpin = (message) => {
    channel.unpinMessage(message).catch(() => undefined);
  };

  return createPortal(
    <div className="starred-panel" role="dialog" aria-modal="true" aria-label="Starred messages">
      <button
        type="button"
        className="starred-panel__backdrop"
        onClick={onClose}
        aria-label="Close starred messages"
      />
      <aside className="starred-panel__content">
        <header className="starred-panel__header">
          <h2>Starred messages</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </header>

        {pinned.length === 0 ? (
          <p className="starred-panel__empty">
            Star a message from its menu to save it here.
          </p>
        ) : (
          <ul className="starred-panel__list">
            {pinned.map((message) => (
              <li key={message.id} className="starred-panel__item">
                <div className="starred-panel__meta">
                  <span className="starred-panel__author">{message.user?.name || "Unknown"}</span>
                  <span className="starred-panel__time">
                    {new Date(message.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="starred-panel__text">{message.text || "Attachment"}</p>
                <button
                  type="button"
                  className="starred-panel__unstar"
                  onClick={() => unpin(message)}
                >
                  <StarIcon aria-hidden="true" />
                  Unstar
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>,
    document.body,
  );
};

export default StarredMessagesPanel;
