import { Link, useLocation, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import {
  BellIcon,
  HomeIcon,
  ShipWheelIcon,
  UsersIcon,
  SearchIcon,
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

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { setHomeView, homeView } = useNavigationStore();

  const [unreadCounts, setUnreadCounts] = useState({});
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const filteredFriends = friends.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  const incomingReqs = friendRequests?.incomingReqs || [];
  const pendingCount = incomingReqs.length;

  useEffect(() => {
    if (!authUser || !tokenData?.token) return;

    const handleEvent = (event) => {
      if (
        event.type === "message.new" ||
        event.type === "notification.message_new"
      ) {
        if (event.user.id !== authUser._id) {
          const channelId = event.channel_id || event.cid?.split(":")[1];
          setUnreadCounts((prev) => ({
            ...prev,
            [channelId]: (prev[channelId] || 0) + 1,
          }));
        }
      } else if (
        event.type === "message.read" ||
        event.type === "notification.mark_read"
      ) {
        if (event.user.id === authUser._id) {
          const channelId = event.channel_id || event.cid?.split(":")[1];
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
        const filter = { type: "messaging", members: { $in: [authUser._id] } };
        const channels = await streamClient.queryChannels(
          filter,
          {},
          { watch: true },
        );

        const counts = {};
        channels.forEach((c) => {
          counts[c.id] = c.countUnread();
        });
        setUnreadCounts(counts);

        streamClient.on(handleEvent);
      } catch (error) {
        console.error("Error in Sidebar Stream init:", error);
      }
    };

    initStream();

    return () => {
      streamClient.off(handleEvent);
    };
  }, [authUser, tokenData]);

  return (
    <aside className="w-72 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link 
          to="/" 
          onClick={() => setHomeView("friends")}
          className="flex items-center gap-2.5"
        >
          <ShipWheelIcon className="size-9 text-primary" />
          <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
            Streamify
          </span>
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        <button
          onClick={() => {
            setHomeView("friends");
            if (currentPath !== "/") navigate("/");
          }}
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
            onClick={() => {
              setIsRequestsOpen(!isRequestsOpen);
            }}
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
            <svg
              className={`size-3 ml-1 transition-transform ${isRequestsOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isRequestsOpen && (
            <div className="space-y-1 mt-2 ml-4 border-l-2 border-base-300 pl-2 max-h-48 overflow-y-auto">
              {incomingReqs.length > 0 ? (
                <>
                  {incomingReqs.map((req) => (
                    <Link
                      key={req._id}
                      to="/notifications"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors"
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
                    </Link>
                  ))}
                  <Link
                    to="/notifications"
                    className="block text-center text-[10px] py-2 opacity-50 hover:opacity-100 transition-opacity font-bold uppercase tracking-widest"
                  >
                    View all requests
                  </Link>
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
          onClick={() => {
            setHomeView("discover");
            if (currentPath !== "/") navigate("/");
          }}
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
            currentPath === "/" && homeView === "discover" ? "btn-active" : ""
          }`}
        >
          <SearchIcon className="size-5 text-base-content opacity-70" />
          <span>Make New Connections</span>
        </button>
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
                placeholder="Search friends..."
                className="input input-bordered input-sm w-full pl-9 bg-base-300/50 border-none focus:bg-base-300 transition-all rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

              return (
                <Link
                  key={friend._id}
                  to={`/chat/${friend._id}`}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors ${
                    currentPath === `/chat/${friend._id}` ? "bg-base-300" : ""
                  }`}
                >
                  <div className="avatar">
                    <div className="w-10 rounded-full border border-base-300">
                      <img 
                      src={friend.profilePic} 
                      alt={friend.fullName} 
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=random`;
                      }}
                    />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {friend.fullName}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="badge badge-primary badge-sm font-bold">
                      {unreadCount}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
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
    </aside>
  );
};

export default Sidebar;
