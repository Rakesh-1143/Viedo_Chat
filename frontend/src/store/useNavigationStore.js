import { create } from "zustand";

export const useNavigationStore = create((set) => ({
  homeView: "friends", // 'friends' or 'discover'
  setHomeView: (view) => set({ homeView: view }),
}));
