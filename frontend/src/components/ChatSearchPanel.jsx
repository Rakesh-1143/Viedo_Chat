import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SearchIcon, XIcon } from "lucide-react";
import { useChannelActionContext } from "stream-chat-react";
import useEscapeKey from "../hooks/useEscapeKey";

const SEARCH_DEBOUNCE_MS = 350;

const ChatSearchPanel = ({ channel, onClose }) => {
  const { jumpToMessage } = useChannelActionContext("ChatSearchPanel");
  useEscapeKey(onClose);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await channel.search(trimmed, { limit: 25 });
        if (cancelled) return;
        setResults(response.results?.map((result) => result.message) || []);
        setSearchError(null);
      } catch (error) {
        if (cancelled) return;
        console.error("Chat search failed", error);
        setResults([]);
        setSearchError(
          error?.response?.data?.message || "Search isn't available right now.",
        );
      } finally {
        if (!cancelled) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, channel]);

  const handleSelect = (messageId) => {
    jumpToMessage(messageId);
    onClose();
  };

  return createPortal(
    <div className="starred-panel" role="dialog" aria-modal="true" aria-label="Search messages">
      <button
        type="button"
        className="starred-panel__backdrop"
        onClick={onClose}
        aria-label="Close search"
      />
      <aside className="starred-panel__content">
        <header className="starred-panel__header">
          <h2>Search messages</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </header>

        <div className="chat-search__input-wrap">
          <SearchIcon className="chat-search__icon" aria-hidden="true" />
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search in this conversation"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>

        {isSearching && (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner" />
          </div>
        )}

        {!isSearching && searchError && (
          <p className="starred-panel__empty">{searchError}</p>
        )}

        {!isSearching && !searchError && hasSearched && results.length === 0 && (
          <p className="starred-panel__empty">No messages found for &quot;{query.trim()}&quot;</p>
        )}

        {!isSearching && !searchError && results.length > 0 && (
          <ul className="starred-panel__list">
            {results.map((message) => (
              <li key={message.id} className="starred-panel__item">
                <button
                  type="button"
                  className="chat-search__result"
                  onClick={() => handleSelect(message.id)}
                >
                  <div className="starred-panel__meta">
                    <span className="starred-panel__author">
                      {message.user?.name || "Unknown"}
                    </span>
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

export default ChatSearchPanel;
