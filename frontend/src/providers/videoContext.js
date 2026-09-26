import { createContext, useContext } from "react";

export const VideoClientContext = createContext({
  client: null,
  error: null,
  isLoading: false,
});

export const useVideoClient = () => useContext(VideoClientContext);
