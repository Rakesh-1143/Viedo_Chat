import { useEffect, useRef, useState } from "react";
import { MoreVerticalIcon } from "lucide-react";

/**
 * items: { key, label, icon: Component, danger?: boolean, onSelect: () => void }[]
 */
const ChatOptionsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!items?.length) return null;

  return (
    <div className="chat-options-menu" ref={containerRef}>
      <button
        type="button"
        className="icon-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More options"
      >
        <MoreVerticalIcon aria-hidden="true" />
      </button>
      {open && (
        <ul className="chat-options-menu__list" role="menu">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={item.danger ? "chat-options-menu__danger" : undefined}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ChatOptionsMenu;
