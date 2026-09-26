import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CallingState,
  StreamVideo,
  StreamVideoClient,
  useCalls,
} from "@stream-io/video-react-sdk";
import { PhoneIcon, PhoneOffIcon, VideoIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import toast from "react-hot-toast";
import { getStreamToken } from "../lib/api";
import { getCallMode } from "../lib/call";
import { VideoClientContext } from "./videoContext";

const IncomingCallDialog = () => {
  const calls = useCalls();
  const navigate = useNavigate();
  const location = useLocation();
  const [action, setAction] = useState(null);

  const incomingCall = calls.find(
    (call) =>
      !call.isCreatedByMe &&
      call.state.callingState === CallingState.RINGING &&
      location.pathname !== `/call/${call.id}`,
  );

  if (!incomingCall) return null;

  const caller = incomingCall.state.createdBy;
  const mode = getCallMode(incomingCall);

  const acceptCall = async () => {
    setAction("accepting");
    try {
      if (mode === "audio") await incomingCall.camera.disable();
      await incomingCall.join();
      navigate(`/call/${incomingCall.id}?type=${encodeURIComponent(incomingCall.type)}`);
    } catch (error) {
      console.error("Failed to accept call", error);
      toast.error("The call could not be connected.");
      setAction(null);
    }
  };

  const rejectCall = async () => {
    setAction("rejecting");
    try {
      await incomingCall.leave({ reject: true, reason: "decline" });
    } catch (error) {
      console.error("Failed to reject call", error);
      toast.error("The call could not be declined. Please try again.");
      setAction(null);
    }
  };

  return (
    <div className="incoming-call-backdrop" role="presentation">
      <section
        className="incoming-call-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-call-title"
      >
        <div className="incoming-call-avatar" aria-hidden="true">
          {caller?.image ? (
            <img src={caller.image} alt="" />
          ) : (
            <span>{caller?.name?.slice(0, 1)?.toUpperCase() || "?"}</span>
          )}
        </div>
        <div>
          <p className="incoming-call-label">
            Incoming {mode === "audio" ? "audio" : "video"} call
          </p>
          <h2 id="incoming-call-title">{caller?.name || "A connection"}</h2>
          <p>Wants to practice with you now</p>
        </div>
        <div className="incoming-call-actions">
          <button
            type="button"
            className="call-action call-action--decline"
            onClick={rejectCall}
            disabled={Boolean(action)}
            aria-label="Decline call"
          >
            <PhoneOffIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="call-action call-action--accept"
            onClick={acceptCall}
            disabled={Boolean(action)}
            aria-label={`Accept ${mode} call`}
          >
            {mode === "audio" ? (
              <PhoneIcon aria-hidden="true" />
            ) : (
              <VideoIcon aria-hidden="true" />
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export const VideoProvider = ({ authUser, children }) => {
  const pendingDisconnect = useRef(null);
  const apiKey = import.meta.env.VITE_STREAM_API_KEY;
  const userId = authUser?._id ? String(authUser._id) : null;
  const userName = authUser?.fullName || "Streamify member";
  const userImage = authUser?.profilePic || undefined;

  const { data: tokenData, isLoading, error } = useQuery({
    queryKey: ["streamToken", authUser?._id],
    queryFn: getStreamToken,
    enabled: Boolean(authUser && apiKey),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const token = tokenData?.token;

  const client = useMemo(() => {
    if (!userId || !apiKey || !token) return null;

    return StreamVideoClient.getOrCreateInstance({
      apiKey,
      user: {
        id: userId,
        name: userName,
        image: userImage,
      },
      token,
      options: {
        devicePersistence: {
          enabled: true,
          storageKey: "streamify-device-preferences",
        },
      },
    });
  }, [apiKey, token, userId, userImage, userName]);

  const [connectionState, setConnectionState] = useState({
    client: null,
    ready: false,
    timedOut: false,
  });

  useEffect(() => {
    if (!client) return undefined;

    const subscription = client.state.connectedUser$.subscribe((user) => {
      setConnectionState((prev) => ({
        client,
        ready: Boolean(user),
        timedOut: prev.client === client ? prev.timedOut : false,
      }));
    });
    const timeoutId = window.setTimeout(() => {
      setConnectionState((prev) => ({ ...prev, client, timedOut: true }));
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [client]);

  const isReady = connectionState.client === client && connectionState.ready;
  const connectTimedOut = connectionState.client === client && connectionState.timedOut;

  useEffect(() => {
    if (!client) return undefined;

    const pending = pendingDisconnect.current;
    if (pending) {
      window.clearTimeout(pending.timer);
      pendingDisconnect.current = null;
      if (pending.client !== client) {
        pending.client.disconnectUser().catch(() => undefined);
      }
    }

    return () => {
      const timer = window.setTimeout(() => {
        client.disconnectUser().catch((disconnectError) => {
          console.error("Failed to disconnect video client", disconnectError);
        });
        if (pendingDisconnect.current?.client === client) {
          pendingDisconnect.current = null;
        }
      }, 0);
      pendingDisconnect.current = { client, timer };
    };
  }, [client]);

  const value = useMemo(() => {
    const timeoutError =
      !isReady && connectTimedOut
        ? new Error("Could not connect to the video service. Check your network and try again.")
        : null;
    return { client, error: error || timeoutError, isLoading, isReady };
  }, [client, connectTimedOut, error, isLoading, isReady]);

  if (!client) {
    return (
      <VideoClientContext.Provider value={value}>
        {children}
      </VideoClientContext.Provider>
    );
  }

  return (
    <VideoClientContext.Provider value={value}>
      <StreamVideo client={client}>
        <IncomingCallDialog />
        {children}
      </StreamVideo>
    </VideoClientContext.Provider>
  );
};

export default VideoProvider;
