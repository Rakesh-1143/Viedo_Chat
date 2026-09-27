import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

const PAGE_SIZE = 30;

const extractImages = (messages) => {
  const images = [];
  for (const message of messages) {
    for (const attachment of message.attachments || []) {
      const url =
        attachment.image_url || (attachment.type === "image" ? attachment.asset_url : null);
      if (url) {
        images.push({ id: `${message.id}-${url}`, url, createdAt: message.created_at });
      }
    }
  }
  return images.reverse();
};

const MediaGalleryPanel = ({ channel, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!channel) return undefined;
    setMessages([...(channel.state.messages || [])]);

    const refresh = () => setMessages([...(channel.state.messages || [])]);
    channel.on("message.new", refresh);
    channel.on("message.updated", refresh);
    channel.on("message.deleted", refresh);
    return () => {
      channel.off("message.new", refresh);
      channel.off("message.updated", refresh);
      channel.off("message.deleted", refresh);
    };
  }, [channel]);

  const images = useMemo(() => extractImages(messages), [messages]);

  const loadEarlier = async () => {
    if (!channel || loadingMore) return;
    const oldestId = channel.state.messages[0]?.id;
    if (!oldestId) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    try {
      const response = await channel.query({
        messages: { limit: PAGE_SIZE, id_lt: oldestId },
      });
      if (!response.messages || response.messages.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setMessages([...(channel.state.messages || [])]);
    } catch (error) {
      console.error("Failed to load earlier media", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return createPortal(
    <div className="starred-panel" role="dialog" aria-modal="true" aria-label="Shared media">
      <button
        type="button"
        className="starred-panel__backdrop"
        onClick={onClose}
        aria-label="Close shared media"
      />
      <aside className="starred-panel__content">
        <header className="starred-panel__header">
          <h2>Shared media</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </header>

        {images.length === 0 ? (
          <p className="starred-panel__empty">
            Photos shared in this conversation will appear here.
          </p>
        ) : (
          <div className="media-gallery__body">
            <div className="media-gallery__grid">
              {images.map((image) => (
                <a
                  key={image.id}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="media-gallery__thumb"
                >
                  <img src={image.url} alt="" loading="lazy" />
                </a>
              ))}
            </div>
            {hasMore && (
              <button
                type="button"
                className="btn btn-ghost btn-sm w-full mt-3"
                onClick={loadEarlier}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load earlier"}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
};

export default MediaGalleryPanel;
