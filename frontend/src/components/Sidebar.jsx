import { Link, useLocation, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import {
  ArchiveIcon,
  BellIcon,
  BellOffIcon,
  HomeIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  ShieldAlertIcon,
  ShipWheelIcon,
  UsersIcon,
  SearchIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getUserFriends,
  getStreamToken,
  getFriendRequests,
} from "../lib/api";
import { useEffect, useState } from "react";
import { connectStreamUser, streamClient } from "../lib/stream";
import { useNavigationStore } from "../store/useNavigationStore";
import NewGroupModal from "./NewGroupModal";

const Sidebar = ({ onClose }) => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { setHomeView, homeView } = useNavigationStore();

  const handleNavigation = (view) => {
    setHomeView(view);
    if (onClose) onClose();
    if (currentPath !== "/") navigate("/");
  };

  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [groups, setGroups] = useState([]);
  const [pinnedChannelIds, setPinnedChannelIds] = useState(() => new Set());
  const [mutedChannelIds, setMutedChannelIds] = useState(() => new Set());
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const filteredFriends = friends
    .filter((friend) => friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedChannelIds.has([authUser?._id, a._id].sort().join("-"));
      const bPinned = pinnedChannelIds.has([authUser?._id, b._id].sort().join("-"));
      if (aPinned === bPinned) return 0;
      return aPinned ? -1 : 1;
    });

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: Boolean(authUser && streamClient),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const incomingReqs = friendRequests?.incomingReqs || [];
  const pendingCount = incomingReqs.length;

  useEffect(() => {
    if (!authUser || !tokenData?.token) return;
    let disposed = false;

    const handleEvent = (event) => {
      if (event.type === "user.presence.changed" && event.user?.id) {
        setOnlineUserIds((currentIds) => {
          const nextIds = new Set(currentIds);
          if (event.user.online) nextIds.add(String(event.user.id));
          else nextIds.delete(String(event.user.id));
          return nextIds;
        });
      } else if (
        event.type === "message.new" ||
        event.type === "notification.message_new"
      ) {
        if (String(event.user?.id) !== String(authUser._id)) {
          const channelId = event.channel_id || event.cid?.split(":")[1];
          if (!channelId) return;
          setUnreadCounts((prev) => ({
            ...prev,
            [channelId]: (prev[channelId] || 0) + 1,
          }));
        }
      } else if (
        event.type === "message.read" ||
        event.type === "notification.mark_read"
      ) {
        if (String(event.user?.id) === String(authUser._id)) {
          const channelId = event.channel_id || event.cid?.split(":")[1];
          if (!channelId) return;
          setUnreadCounts((prev) => ({
            ...prev,
            [channelId]: 0,
          }));
        }
      }
    };

    const initStream = async () => {
      try {
        await connectStreamUser(authUser, tokenData.token);

        // Fetch initial unread counts
        const filter = {
          type: "messaging",
          members: { $in: [authUser._id] },
          archived: false,
        };
        const channels = await streamClient.queryChannels(
          filter,
          [{ pinned_at: -1 }, { last_message_at: -1 }],
          { watch: true, state: true, presence: true },
        );
        if (disposed) return;

        const counts = {};
        const onlineIds = new Set();
        const groupChannels = [];
        const pinnedIds = new Set();
        const mutedIds = new Set();
        channels.forEach((c) => {
          counts[c.id] = c.countUnread();
          Object.values(c.state.members || {}).forEach((member) => {
            if (member.user?.online) onlineIds.add(String(member.user.id));
          });
          if (c.state.membership?.pinned_at) pinnedIds.add(c.id);
          if (c.muteStatus?.().muted) mutedIds.add(c.id);
          if (c.data?.is_group) {
            groupChannels.push({
              id: c.id,
              name: c.data?.name || "Group",
              memberCount: Object.keys(c.state.members || {}).length,
            });
          }
        });
        setUnreadCounts(counts);
        setOnlineUserIds(onlineIds);
        setGroups(groupChannels);
        setPinnedChannelIds(pinnedIds);
        setMutedChannelIds(mutedIds);

        streamClient.on(handleEvent);
      } catch (error) {
        console.error("Error in Sidebar Stream init:", error);
      }
    };

    initStream();

    return () => {
      disposed = true;
      streamClient?.off(handleEvent);
    };
  }, [authUser, tokenData?.token]);

  return (
    <aside className="sticky top-0 flex h-screen w-full flex-col border-r border-base-300 bg-base-200/40 lg:w-72">
      <div className="p-5 border-b border-base-300 flex items-center justify-between">
        <Link 
          to="/" 
          onClick={() => handleNavigation("friends")}
          className="brand-mark"
        >
          <ShipWheelIcon aria-hidden="true" />
          <span>Streamify</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="icon-button lg:hidden"
            aria-label="Close navigation"
            title="Close navigation"
          >
            <XIcon aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="p-4 space-y-1">
        <button
          onClick={() => handleNavigation("friends")}
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath === "/" && homeView === "friends" ? "btn-active" : ""
          }`}
        >
          <HomeIcon className="size-5 text-base-content opacity-70" />
          <span>Home</span>
        </button>

        {/* FRIEND REQUESTS TOGGLE */}
        <div>
          <button
            type="button"
            onClick={() => {
              setIsRequestsOpen(!isRequestsOpen);
            }}
            aria-expanded={isRequestsOpen}
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
              currentPath === "/notifications" ? "btn-active" : ""
            }`}
          >
            <BellIcon className="size-5 text-base-content opacity-70" />
            <span>Friend Requests</span>
            {pendingCount > 0 && (
              <span className="badge badge-error badge-sm font-bold ml-auto">
                {pendingCount}
              </span>
            )}
            <ChevronDownIcon
              className={`size-3 ml-1 transition-transform ${isRequestsOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {isRequestsOpen && (
            <div className="space-y-1 mt-2 ml-4 border-l-2 border-base-300 pl-2 max-h-48 overflow-y-auto">
              {incomingReqs.length > 0 ? (
                <>
                  {incomingReqs.map((req) => (
                    <button
                      key={req._id}
                      onClick={() => {
                        if (onClose) onClose();
                        navigate("/notifications");
                      }}
                      className="flex items-center w-full text-left gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <div className="avatar">
                        <div className="w-8 rounded-full border border-base-300">
                          <img
                            src={req.sender.profilePic}
                            alt={req.sender.fullName}
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.sender.fullName)}&background=random`;
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {req.sender.fullName}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (onClose) onClose();
                      navigate("/notifications");
                    }}
                    className="block w-full text-center text-[10px] py-2 opacity-50 hover:opacity-100 transition-opacity font-bold uppercase tracking-widest"
                  >
                    View all requests
                  </button>
                </>
              ) : (
                <div className="mt-2 ml-6 text-[10px] opacity-50 italic py-2">
                  No new requests
                </div>
              )}
            </div>
          )}
        </div>

        {/* MEET NEW LEARNERS BUTTON */}
        <button
          onClick={() => handleNavigation("discover")}
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
            currentPath === "/" && homeView === "discover" ? "btn-active" : ""
          }`}
        >
          <SearchIcon className="size-5 text-base-content opacity-70" />
          <span>Make New Connections</span>
        </button>

        {/* CALL HISTORY BUTTON */}
        <button
          onClick={() => {
            if (onClose) onClose();
            navigate("/calls");
          }}
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
            currentPath === "/calls" ? "btn-active" : ""
          }`}
        >
          <PhoneIcon className="size-5 text-base-content opacity-70" />
          <span>Call History</span>
        </button>

        {/* ARCHIVED CHATS BUTTON */}
        <button
          onClick={() => {
            if (onClose) onClose();
            navigate("/archived");
          }}
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
            currentPath === "/archived" ? "btn-active" : ""
          }`}
        >
          <ArchiveIcon className="size-5 text-base-content opacity-70" />
          <span>Archived Chats</span>
        </button>

        {/* NEW GROUP BUTTON */}
        <button
          onClick={() => setShowNewGroup(true)}
          className="btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative"
        >
          <PlusIcon className="size-5 text-base-content opacity-70" />
          <span>New Group</span>
        </button>

        {/* ADMIN REPORTS BUTTON */}
        {authUser?.role === "admin" && (
          <button
            onClick={() => {
              if (onClose) onClose();
              navigate("/admin/reports");
            }}
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
              currentPath === "/admin/reports" ? "btn-active" : ""
            }`}
          >
            <ShieldAlertIcon className="size-5 text-base-content opacity-70" />
            <span>User Reports</span>
          </button>
        )}
      </nav>

      {/* FRIENDS SECTION */}
      <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-base-300">
        <div className="flex items-center justify-between px-2 py-3 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4" />
            Friends
          </div>
          {friends.length > 0 && (
            <span className="badge badge-ghost badge-sm">{friends.length}</span>
          )}
        </div>

        {/* SEARCH BAR */}
        {friends.length > 0 && (
          <div className="px-2 mb-4">
            <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                data-sidebar-search
                placeholder="Search friends... (Ctrl+K)"
                className="input input-bordered input-sm w-full rounded-lg bg-base-200 pl-9 transition-colors focus:bg-base-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search friends"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          {loadingFriends ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-md opacity-20"></span>
            </div>
          ) : friends.length === 0 ? (
            <p className="text-center py-4 text-xs opacity-50 italic">
              No friends yet
            </p>
          ) : filteredFriends.length === 0 ? (
            <p className="text-center py-4 text-xs opacity-50 italic">
              No friends found
            </p>
          ) : (
            filteredFriends.map((friend) => {
              const channelId = [authUser._id, friend._id].sort().join("-");
              const unreadCount = unreadCounts[channelId] || 0;
              const isOnline = onlineUserIds.has(String(friend._id));
              const isPinned = pinnedChannelIds.has(channelId);
              const isMuted = mutedChannelIds.has(channelId);

              return (
                <button
                  key={friend._id}
                  onClick={() => {
                    if (onClose) onClose();
                    navigate(`/chat/${friend._id}`);
                  }}
                  className={`flex items-center w-full text-left gap-3 p-2 rounded-lg transition-colors ${
                    currentPath === `/chat/${friend._id}`
                      ? "bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]"
                      : "hover:bg-base-300"
                  }`}
                >
                  <div className="avatar relative">
                    <div className="w-10 rounded-full border border-base-300">
                      <img 
                      src={friend.profilePic} 
                      alt={friend.fullName} 
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=random`;
                      }}
                    />
                    </div>
                    <span
                      className={`presence-dot ${isOnline ? "presence-dot--online" : ""}`}
                      aria-label={isOnline ? "Online" : "Offline"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {friend.fullName}
                      {isPinned && (
                        <PinIcon className="size-3 opacity-50 shrink-0" aria-label="Pinned" />
                      )}
                      {isMuted && (
                        <BellOffIcon className="size-3 opacity-50 shrink-0" aria-label="Muted" />
                      )}
                    </p>
                    <p className={`text-xs ${isOnline ? "text-success" : "opacity-50"}`}>
                      {isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="badge badge-primary badge-sm font-bold">
                      {unreadCount}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* GROUPS SECTION */}
        {groups.length > 0 && (
          <>
            <div className="flex items-center justify-between px-2 py-3 mt-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4" />
                Groups
              </div>
              <span className="badge badge-ghost badge-sm">{groups.length}</span>
            </div>
            <div className="space-y-1">
              {groups.map((group) => {
                const unreadCount = unreadCounts[group.id] || 0;
                const isActive = currentPath === `/chat/group/${group.id}`;
                const isPinned = pinnedChannelIds.has(group.id);
                const isMuted = mutedChannelIds.has(group.id);

                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      if (onClose) onClose();
                      navigate(`/chat/group/${group.id}`);
                    }}
                    className={`flex items-center w-full text-left gap-3 p-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]"
                        : "hover:bg-base-300"
                    }`}
                  >
                    <div className="avatar placeholder">
                      <div className="w-10 rounded-full bg-primary/15 text-primary">
                        <UsersIcon className="size-4" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {group.name}
                        {isPinned && (
                          <PinIcon className="size-3 opacity-50 shrink-0" aria-label="Pinned" />
                        )}
                        {isMuted && (
                          <BellOffIcon className="size-3 opacity-50 shrink-0" aria-label="Muted" />
                        )}
                      </p>
                      <p className="text-xs opacity-50">{group.memberCount} members</p>
                    </div>
                    {unreadCount > 0 && (
                      <div className="badge badge-primary badge-sm font-bold">
                        {unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 mt-auto">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full ring ring-success ring-offset-base-100 ring-offset-2">
              <img 
                src={authUser?.profilePic} 
                alt="User Avatar" 
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.fullName || "User")}&background=random`;
                }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-sm truncate">
              {authUser?.fullName}
            </p>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="size-2 rounded-full bg-success inline-block animate-pulse" />
              Online
            </p>
          </div>
        </div>
      </div>

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
    </aside>
  );
};

export default Sidebar;
