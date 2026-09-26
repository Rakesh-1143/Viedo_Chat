import { LoaderIcon } from "lucide-react";

function ChatLoader() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center p-4">
      <LoaderIcon className="animate-spin size-10 text-primary" />
      <p className="mt-4 text-center text-sm font-medium opacity-70">Connecting to chat...</p>
    </div>
  );
}

export default ChatLoader;
