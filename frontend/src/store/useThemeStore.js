import { create } from "zustand";

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("streamify-theme");
  if (savedTheme === "light" || savedTheme === "night") return savedTheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "night" : "light";
};

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem("streamify-theme", theme);
    set({ theme });
  },
}));
