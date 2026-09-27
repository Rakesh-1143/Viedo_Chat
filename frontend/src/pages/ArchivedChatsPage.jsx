import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArchiveIcon, ArchiveRestoreIcon, UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken } from "../lib/api";
import { connectStreamUser, streamClient } from "../lib/stream";

const ArchivedChatsPage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: Boolean(authUser && streamClient),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!tokenData?.token || !authUser || !streamClient) return undefined;
    let disposed = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await connectStreamUser(authUser, tokenData.token);
        const result = await streamClient.queryChannels(
          { type: "messaging", members: { $in: [String(authUser._id)] }, archived: true },
          [{ last_message_at: -1 }],
          { state: true, watch: false },
        );
        if (!disposed) setChannels(result);
      } catch (err) {
        if (!disposed) {
          console.error("Failed to load archived chats", err);
          setError(err);
        }
      } finally {
        if (!disposed) setIsLoading(false);
      }
    };

    load();
    return () => {
      disposed = true;
    };
  }, [authUser, tokenData?.token]);

  const unarchive = async (channel) => {
    try {
      await channel.unarchive();
      setChannels((prev) => prev.filter((c) => c.cid !== channel.cid));
      toast.success("Conversation unarchived");
    } catch {
      toast.error("Could not unarchive this conversation");
    }
  };

  const openChannel = (channel) => {
    if (channel.data?.is_group) {
      navigate(`/chat/group/${channel.id}`);
      return;
    }
    const otherId = Object.keys(channel.state.members || {}).find(
      (id) => id !== String(authUser._id),
    );
    if (otherId) navigate(`/chat/${otherId}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div>
          <p className="page-kicker">Activity</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Archived Chats</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : error ? (
          <div className="card bg-base-200 p-8 text-center border-2 border-dashed border-base-300">
            <p>Could not load archived chats.</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="card bg-base-200 p-8 sm:p-12 text-center border-2 border-dashed border-base-300">
            <div className="flex flex-col items-center gap-3">
              <ArchiveIcon className="size-8 opacity-40" />
              <h3 className="font-bold text-xl">No archived chats</h3>
              <p className="text-base-content opacity-70">
                Conversations you archive will show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((channel) => {
              const isGroup = Boolean(channel.data?.is_group);
              const otherMember = !isGroup
                ? Object.values(channel.state.members || {}).find(
                    (m) => String(m.user?.id) !== String(authUser._id),
                  )?.user
                : null;
              const name = isGroup
                ? channel.data?.name || "Group"
                : otherMember?.name || "Unknown";

              return (
                <div key={channel.cid} className="card bg-base-200 shadow-sm">
                  <div className="card-body p-4 flex-row items-center gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => openChannel(channel)}
                    >
                      {isGroup ? (
                        <div className="conversation-avatar conversation-avatar--group size-11 shrink-0">
                          <UsersIcon aria-hidden="true" />
                        </div>
                      ) : (
                        <div className="avatar size-11 rounded-full overflow-hidden bg-base-300 shrink-0">
                          <img src={otherMember?.image} alt="" />
                        </div>
                      )}
                      <p className="font-semibold truncate">{name}</p>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline gap-2 shrink-0"
                      onClick={() => unarchive(channel)}
                    >
                      <ArchiveRestoreIcon className="size-4" aria-hidden="true" />
                      Unarchive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedChatsPage;
