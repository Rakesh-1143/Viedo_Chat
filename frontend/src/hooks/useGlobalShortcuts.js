import { useEffect } from "react";

const focusVisibleSidebarSearch = () => {
  const candidates = document.querySelectorAll("[data-sidebar-search]");
  for (const candidate of candidates) {
    if (candidate.offsetParent !== null) {
      candidate.focus();
      candidate.select?.();
      return true;
    }
  }
  return false;
};

export const useGlobalShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isSearchShortcut) return;

      const focused = focusVisibleSidebarSearch();
      if (focused) event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
};

export default useGlobalShortcuts;
