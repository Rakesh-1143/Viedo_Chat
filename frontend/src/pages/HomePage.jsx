import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
} from "../lib/api";
import { Link } from "react-router";
import {
  CheckCircleIcon,
  MapPinIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
  LoaderIcon,
} from "lucide-react";

import { capitialize } from "../lib/utils";

import NoFriendsFound from "../components/NoFriendsFound";
import LanguageFlag from "../components/LanguageFlag";
import { useNavigationStore } from "../store/useNavigationStore";
import ChatPage from "./ChatPage";

const HomePage = () => {
  const queryClient = useQueryClient();
  const { homeView, setHomeView } = useNavigationStore();
  const [searchQuery, setSearchQuery] = useState("");
  const observer = useRef();

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { 
    data: recommendedData, 
    isLoading: loadingUsers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["users", searchQuery],
    queryFn: ({ pageParam = 1 }) => getRecommendedUsers({ page: pageParam, limit: 12, search: searchQuery }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const lastUserRef = useCallback(node => {
    if (loadingUsers) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingUsers, hasNextPage, fetchNextPage]);

  const recommendedUsers = useMemo(() => {
    return recommendedData?.pages.flatMap(page => page.users) || [];
  }, [recommendedData]);

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  // Default to discover view if no friends
  useEffect(() => {
    if (!loadingFriends && friends.length === 0) {
      setHomeView("discover");
    }
  }, [loadingFriends, friends, setHomeView]);

  const { mutate: sendRequestMutation, isPending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] }),
  });

  const outgoingRequestsIds = useMemo(() => {
    const ids = new Set();
    if (outgoingFriendReqs) {
      outgoingFriendReqs.forEach((req) => ids.add(req.recipient._id));
    }
    return ids;
  }, [outgoingFriendReqs]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return recommendedUsers;
    const query = searchQuery.toLowerCase();
    return recommendedUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.nativeLanguage.toLowerCase().includes(query) ||
        user.learningLanguage.toLowerCase().includes(query) ||
        (user.location && user.location.toLowerCase().includes(query))
    );
  }, [recommendedUsers, searchQuery]);

  if (loadingFriends) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div
        className={
          homeView === "friends" && friends.length > 0
            ? "h-full"
            : "container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-10"
        }
      >
        {homeView === "friends" && (
          <>
            {friends.length === 0 ? (
              <div className="p-4 sm:p-6 lg:p-8">
                <NoFriendsFound />
              </div>
            ) : (
              <ChatPage id={friends[0]._id} />
            )}
          </>
        )}

        {homeView === "discover" && (
          <section>
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <p className="page-kicker">Discover</p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Make New Connections
                  </h2>
                  <p className="opacity-70">
                    Discover perfect language exchange partners based on your profile
                  </p>
                </div>

                {/* SEARCH BAR */}
                <div className="relative w-full md:w-80">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-40" />
                  <input
                    type="text"
                    placeholder="Search by name, language or city..."
                    className="input input-bordered w-full pl-10 h-12 rounded-xl focus:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="card bg-base-200 p-12 text-center border-2 border-dashed border-base-300">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-base-300 p-4 rounded-full">
                    <SearchIcon className="size-8 opacity-40" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1">
                      {searchQuery ? "No results found" : "No recommendations available"}
                    </h3>
                    <p className="text-base-content opacity-70">
                      {searchQuery 
                        ? `We couldn't find anyone matching "${searchQuery}". Try a different search.`
                        : "Check back later for new language partners!"}
                    </p>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")} 
                        className="btn btn-ghost btn-sm mt-4 text-primary"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map((user, index) => {
                    const hasRequestBeenSent = outgoingRequestsIds.has(user._id);
                    const isLastElement = filteredUsers.length === index + 1;

                    return (
                      <div
                        key={user._id}
                        ref={isLastElement ? lastUserRef : null}
                        className="card bg-base-200 hover:shadow-lg transition-all duration-300 border border-base-300 hover:border-primary/30"
                      >
                        <div className="card-body p-5 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="avatar size-16 rounded-full overflow-hidden ring-2 ring-base-300 ring-offset-2 ring-offset-base-200">
                              <img
                                src={user.profilePic}
                                alt={user.fullName}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`;
                                }}
                              />
                            </div>

                            <div>
                              <h3 className="font-semibold text-lg">
                                {user.fullName}
                              </h3>
                              {user.location && (
                                <div className="flex items-center text-xs opacity-70 mt-1">
                                  <MapPinIcon className="size-3 mr-1" />
                                  {user.location}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Languages with flags */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="badge badge-secondary gap-1">
                              <LanguageFlag language={user.nativeLanguage} />
                              Native: {capitialize(user.nativeLanguage)}
                            </span>
                            <span className="badge badge-outline gap-1">
                              <LanguageFlag language={user.learningLanguage} />
                              Learning: {capitialize(user.learningLanguage)}
                            </span>
                          </div>

                          {user.bio && (
                            <p className="text-sm opacity-70 line-clamp-3 min-h-[3rem]">
                              {user.bio}
                            </p>
                          )}

                          {/* Action button */}
                          <button
                            className={`btn w-full mt-2 ${
                              hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                            } `}
                            onClick={() => sendRequestMutation(user._id)}
                            disabled={hasRequestBeenSent || isPending}
                          >
                            {hasRequestBeenSent ? (
                              <>
                                <CheckCircleIcon className="size-4 mr-2" />
                                Request Sent
                              </>
                            ) : (
                              <>
                                <UserPlusIcon className="size-4 mr-2" />
                                Send Friend Request
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* INFINITE SCROLL LOADER */}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-8">
                    <LoaderIcon className="animate-spin size-8 text-primary opacity-50" />
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
