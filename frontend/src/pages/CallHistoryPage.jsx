import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  MessageSquareIcon,
  PhoneIcon,
  PhoneMissedIcon,
  PhoneOffIcon,
  VideoIcon,
} from "lucide-react";
import { getCallHistory } from "../lib/api";

const STATUS_LABEL = {
  completed: "Completed",
  missed: "Missed",
  rejected: "Declined",
  canceled: "Canceled",
  ringing: "Ringing",
  accepted: "In progress",
};

const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes === 0 ? `${remainder}s` : `${minutes}m ${remainder}s`;
};

const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const CallHistoryPage = () => {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["callHistory"],
    queryFn: getCallHistory,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div>
          <p className="page-kicker">Activity</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Call History</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : calls.length === 0 ? (
          <div className="card bg-base-200 p-8 sm:p-12 text-center border-2 border-dashed border-base-300">
            <div className="flex flex-col items-center gap-3">
              <PhoneIcon className="size-8 opacity-40" />
              <h3 className="font-bold text-xl">No calls yet</h3>
              <p className="text-base-content opacity-70">
                Your audio and video call history will show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => {
              const isMissedOrDeclined =
                ["missed", "rejected"].includes(call.status) && call.direction === "incoming";
              const StatusIcon = isMissedOrDeclined
                ? PhoneMissedIcon
                : call.status === "canceled"
                  ? PhoneOffIcon
                  : call.mode === "video"
                    ? VideoIcon
                    : PhoneIcon;

              return (
                <div key={call._id} className="card bg-base-200 shadow-sm">
                  <div className="card-body p-4 flex-row items-center gap-3">
                    <div className="avatar size-11 rounded-full overflow-hidden bg-base-300 shrink-0">
                      <img
                        src={call.counterpart?.profilePic}
                        alt={call.counterpart?.fullName || "User"}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(call.counterpart?.fullName || "User")}&background=random`;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {call.counterpart?.fullName || "Unknown"}
                      </p>
                      <p
                        className={`text-xs flex items-center gap-1 ${
                          isMissedOrDeclined ? "text-error" : "opacity-60"
                        }`}
                      >
                        <StatusIcon className="size-3 shrink-0" />
                        <span className="truncate">
                          {call.direction === "outgoing" ? "Outgoing" : "Incoming"} ·{" "}
                          {STATUS_LABEL[call.status] || call.status}
                          {call.status === "completed" &&
                            call.durationSeconds > 0 &&
                            ` · ${formatDuration(call.durationSeconds)}`}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-xs opacity-50 whitespace-nowrap">
                        {formatWhen(call.startedAt)}
                      </span>
                      {call.counterpart?._id && (
                        <Link
                          to={`/chat/${call.counterpart._id}`}
                          className="icon-button"
                          aria-label={`Message ${call.counterpart.fullName}`}
                          title="Message"
                        >
                          <MessageSquareIcon className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
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

export default CallHistoryPage;
