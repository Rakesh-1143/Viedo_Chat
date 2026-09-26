import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  CallingState,
  PaginatedGridLayout,
  StreamCall,
  StreamTheme,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import {
  CameraIcon,
  CameraOffIcon,
  FlipHorizontal2Icon,
  MicIcon,
  MicOffIcon,
  MonitorUpIcon,
  PhoneIcon,
  PhoneOffIcon,
  RotateCcwIcon,
  UsersIcon,
  WifiOffIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import { formatCallDuration, getCallErrorMessage, getCallMode } from "../lib/call";
import { useVideoClient } from "../providers/videoContext";
import { updateCallStatus } from "../lib/api";
import "@stream-io/video-react-sdk/dist/css/styles.css";

const CALL_TYPE = import.meta.env.VITE_STREAM_CALL_TYPE || "default";

const useElapsedTime = (startedAt) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTime = startedAt ? new Date(startedAt).getTime() : null;

  useEffect(() => {
    if (!startTime) return undefined;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, (Date.now() - startTime) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startTime]);

  return formatCallDuration(elapsedSeconds);
};

const CallPage = () => {
  const { id: callId } = useParams();
  const [searchParams] = useSearchParams();
  const { client, error: clientError, isLoading, isReady } = useVideoClient();
  const callType = searchParams.get("type") || CALL_TYPE;
  const call = useMemo(
    () => (client && callId ? client.call(callType, callId) : null),
    [callId, callType, client],
  );
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!call || !isReady) return undefined;
    const state = call.state.callingState;
    if (state === CallingState.UNKNOWN || state === CallingState.IDLE) {
      call.get().catch((error) => {
        console.error("Failed to load call", error);
        setLoadError(error);
      });
    }

    const leaveOnPageExit = () => {
      if (call.state.callingState !== CallingState.LEFT) {
        call.leave().catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", leaveOnPageExit);
    return () => {
      window.removeEventListener("pagehide", leaveOnPageExit);
      leaveOnPageExit();
    };
  }, [call, isReady]);

  if (isLoading || (client && !isReady && !clientError)) return <PageLoader />;

  if (!client || !call || clientError || loadError) {
    return (
      <CallUnavailable
        message={
          !import.meta.env.VITE_STREAM_API_KEY
            ? "Video calling is not configured for this environment."
            : getCallErrorMessage(clientError || loadError)
        }
      />
    );
  }

  return (
    <StreamCall call={call}>
      <CallExperience />
    </StreamCall>
  );
};

const CallUnavailable = ({ message }) => {
  const navigate = useNavigate();
  return (
    <main className="call-page call-page--centered">
      <div className="call-empty-state">
        <WifiOffIcon aria-hidden="true" />
        <h1>Call unavailable</h1>
        <p>{message}</p>
        <button type="button" className="call-secondary-button" onClick={() => navigate("/")}>
          Back to conversations
        </button>
      </div>
    </main>
  );
};

const CallExperience = () => {
  const call = useCall();
  const navigate = useNavigate();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    if (!call) return;
    if (callingState === CallingState.LEFT && !call.state.startedAt) {
      updateCallStatus(call.id, { status: "missed" }).catch(() => undefined);
    }
  }, [call, callingState]);

  if (!call) return <CallUnavailable message="The call could not be loaded." />;

  if (callingState === CallingState.RINGING) {
    return call.isCreatedByMe ? (
      <OutgoingCall call={call} />
    ) : (
      <IncomingCall call={call} />
    );
  }

  if ([CallingState.UNKNOWN, CallingState.IDLE].includes(callingState)) {
    return <CallLobby />;
  }

  if (callingState === CallingState.JOINING) {
    return (
      <main className="call-page call-page--centered">
        <div className="call-progress" role="status">
          <span className="loading loading-spinner loading-lg" />
          <p>Connecting your call...</p>
        </div>
      </main>
    );
  }

  if (callingState === CallingState.LEFT) {
    return (
      <main className="call-page call-page--centered">
        <div className="call-empty-state">
          <PhoneOffIcon aria-hidden="true" />
          <h1>Call ended</h1>
          <p>Your camera and microphone have been released.</p>
          <button type="button" className="call-secondary-button" onClick={() => navigate("/")}>
            Return to conversations
          </button>
        </div>
      </main>
    );
  }

  if (callingState === CallingState.RECONNECTING_FAILED) {
    return (
      <main className="call-page call-page--centered">
        <div className="call-empty-state">
          <WifiOffIcon aria-hidden="true" />
          <h1>Connection lost</h1>
          <p>We could not restore this call. Check your network before trying again.</p>
          <button type="button" className="call-secondary-button" onClick={() => navigate("/")}>
            Leave call
          </button>
        </div>
      </main>
    );
  }

  return <ActiveCallRoom />;
};

const PersonAvatar = ({ call }) => {
  const person = call.state.members.find(
    ({ user }) => user.id !== call.currentUserId,
  )?.user;
  return (
    <div className="call-person-avatar">
      {person?.image ? <img src={person.image} alt="" /> : <span>{person?.name?.[0] || "?"}</span>}
    </div>
  );
};

const OutgoingCall = ({ call }) => {
  const navigate = useNavigate();
  const [isCanceling, setIsCanceling] = useState(false);
  const targetName = call.state.custom?.targetName || "your connection";
  const mode = getCallMode(call);

  const cancel = async () => {
    setIsCanceling(true);
    try {
      await call.leave({ reject: true, reason: "cancel" });
      updateCallStatus(call.id, { status: "canceled" }).catch(() => undefined);
      navigate("/");
    } catch {
      toast.error("The call could not be canceled.");
      setIsCanceling(false);
    }
  };

  return (
    <main className="call-page call-page--centered">
      <div className="ringing-panel">
        <PersonAvatar call={call} />
        <p className="ringing-panel__status">Calling</p>
        <h1>{targetName}</h1>
        <p>{mode === "audio" ? "Audio" : "Video"} call</p>
        <span className="ringing-pulse" aria-hidden="true" />
        <button
          type="button"
          className="call-action call-action--decline"
          onClick={cancel}
          disabled={isCanceling}
          aria-label="Cancel call"
        >
          <PhoneOffIcon aria-hidden="true" />
        </button>
      </div>
    </main>
  );
};

const IncomingCall = ({ call }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const caller = call.state.createdBy;

  const accept = async () => {
    setBusy(true);
    try {
      if (getCallMode(call) === "audio") await call.camera.disable();
      await call.join();
      updateCallStatus(call.id, { status: "accepted" }).catch(() => undefined);
    } catch (error) {
      toast.error(getCallErrorMessage(error));
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    await call.leave({ reject: true, reason: "decline" }).catch(() => undefined);
    updateCallStatus(call.id, { status: "rejected" }).catch(() => undefined);
    navigate("/");
  };

  return (
    <main className="call-page call-page--centered">
      <div className="ringing-panel">
        <PersonAvatar call={call} />
        <p className="ringing-panel__status">Incoming call</p>
        <h1>{caller?.name || "A connection"}</h1>
        <div className="ringing-panel__actions">
          <button className="call-action call-action--decline" onClick={reject} disabled={busy} aria-label="Decline call">
            <PhoneOffIcon aria-hidden="true" />
          </button>
          <button className="call-action call-action--accept" onClick={accept} disabled={busy} aria-label="Accept call">
            <PhoneIcon aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
};

const CallLobby = () => {
  const call = useCall();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const cameraState = useCameraState();
  const microphoneState = useMicrophoneState();
  const mode = getCallMode(call);

  const cancel = async () => {
    await call.leave().catch(() => undefined);
    navigate("/");
  };

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      if (mode === "audio") {
        await cameraState.camera.disable();
      } else {
        await cameraState.camera.enable();
      }
      await microphoneState.microphone.enable();
      await call.join();
    } catch (joinError) {
      setError(getCallErrorMessage(joinError));
      setJoining(false);
    }
  };

  return (
    <main className="call-page call-lobby">
      <section className="call-lobby__preview" aria-label="Camera preview">
        {mode === "video" && !cameraState.isMute ? (
          <VideoPreview />
        ) : (
          <div className="call-lobby__camera-off">
            <CameraOffIcon aria-hidden="true" />
            <span>Camera is off</span>
          </div>
        )}
      </section>
      <section className="call-lobby__details">
        <p className="call-kicker">Ready to join?</p>
        <h1>Check your camera and microphone</h1>
        <p>You can change both again after joining.</p>
        {error && <div className="call-error" role="alert">{error}</div>}
        <div className="call-lobby__toggles">
          {mode === "video" && (
            <DeviceButton
              active={!cameraState.isMute}
              activeLabel="Turn camera off"
              inactiveLabel="Turn camera on"
              ActiveIcon={CameraIcon}
              InactiveIcon={CameraOffIcon}
              onClick={() => cameraState.camera.toggle()}
            />
          )}
          <DeviceButton
            active={!microphoneState.isMute}
            activeLabel="Mute microphone"
            inactiveLabel="Unmute microphone"
            ActiveIcon={MicIcon}
            InactiveIcon={MicOffIcon}
            onClick={() => microphoneState.microphone.toggle()}
          />
        </div>
        <div className="call-lobby__actions">
          <button type="button" className="call-secondary-button" onClick={cancel}>Cancel</button>
          <button type="button" className="call-primary-button" onClick={join} disabled={joining}>
            {joining ? "Joining..." : "Join call"}
          </button>
        </div>
      </section>
    </main>
  );
};

const DeviceButton = ({
  active,
  activeLabel,
  inactiveLabel,
  ActiveIcon,
  InactiveIcon,
  onClick,
}) => {
  const handleClick = async () => {
    try {
      await onClick();
    } catch (error) {
      toast.error(getCallErrorMessage(error));
    }
  };

  const Icon = active ? ActiveIcon : InactiveIcon;
  return (
    <button
      type="button"
      className={`device-control ${active ? "" : "device-control--off"}`}
      onClick={handleClick}
      aria-label={active ? activeLabel : inactiveLabel}
      title={active ? activeLabel : inactiveLabel}
    >
      <Icon aria-hidden="true" />
    </button>
  );
};

const ActiveCallRoom = () => {
  const call = useCall();
  const navigate = useNavigate();
  const {
    useCallCallingState,
    useCallStartedAt,
    useCameraState,
    useMicrophoneState,
    useParticipantCount,
    useScreenShareState,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const startedAt = useCallStartedAt();
  const participantCount = useParticipantCount();
  const cameraState = useCameraState();
  const microphoneState = useMicrophoneState();
  const screenShareState = useScreenShareState();
  const elapsed = useElapsedTime(startedAt);
  const [leaving, setLeaving] = useState(false);
  const mode = getCallMode(call);
  const canShareScreen = Boolean(navigator.mediaDevices?.getDisplayMedia);
  const connectionMessage = {
    [CallingState.RECONNECTING]: "Reconnecting...",
    [CallingState.OFFLINE]: "You are offline. The call will resume when your network returns.",
    [CallingState.MIGRATING]: "Improving connection...",
  }[callingState];

  const leave = async () => {
    setLeaving(true);
    try {
      await call.leave();
      const durationSeconds = startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
        : 0;
      updateCallStatus(call.id, { status: "completed", durationSeconds }).catch(() => undefined);
      navigate("/");
    } catch {
      toast.error("The call could not close cleanly. Please try again.");
      setLeaving(false);
    }
  };

  const flipCamera = async () => {
    try {
      await cameraState.camera.flip();
    } catch {
      toast.error("No second camera is available on this device.");
    }
  };

  return (
    <StreamTheme className="streamify-call-theme">
      <main className="call-page active-call">
        <header className="active-call__header">
          <div>
            <strong>Streamify</strong>
            <span className="active-call__live-dot" />
            <span>{elapsed}</span>
          </div>
          <div className="active-call__participants">
            <UsersIcon aria-hidden="true" />
            <span>{participantCount}</span>
          </div>
        </header>

        {connectionMessage && (
          <div className="call-connection-banner" role="status">
            {callingState === CallingState.OFFLINE ? <WifiOffIcon /> : <RotateCcwIcon />}
            {connectionMessage}
          </div>
        )}

        <section className="active-call__stage" aria-label="Call participants">
          <PaginatedGridLayout />
        </section>

        {(cameraState.hasBrowserPermission === false ||
          microphoneState.hasBrowserPermission === false) && (
          <div className="call-permission-note" role="status">
            A device is blocked. Use the browser address-bar permissions to enable it.
          </div>
        )}

        <footer className="active-call__controls" aria-label="Call controls">
          <DeviceButton
            active={!microphoneState.isMute}
            activeLabel="Mute microphone"
            inactiveLabel="Unmute microphone"
            ActiveIcon={MicIcon}
            InactiveIcon={MicOffIcon}
            onClick={() => microphoneState.microphone.toggle()}
          />
          {mode === "video" && (
            <>
              <DeviceButton
                active={!cameraState.isMute}
                activeLabel="Turn camera off"
                inactiveLabel="Turn camera on"
                ActiveIcon={CameraIcon}
                InactiveIcon={CameraOffIcon}
                onClick={() => cameraState.camera.toggle()}
              />
              <button type="button" className="device-control" onClick={flipCamera} aria-label="Switch camera" title="Switch camera">
                <FlipHorizontal2Icon aria-hidden="true" />
              </button>
            </>
          )}
          {canShareScreen && (
            <DeviceButton
              active={!screenShareState.isMute}
              activeLabel="Stop sharing screen"
              inactiveLabel="Share screen"
              ActiveIcon={MonitorUpIcon}
              InactiveIcon={MonitorUpIcon}
              onClick={() => screenShareState.screenShare.toggle()}
            />
          )}
          <button type="button" className="device-control device-control--leave" onClick={leave} disabled={leaving} aria-label="End call" title="End call">
            <PhoneOffIcon aria-hidden="true" />
          </button>
        </footer>
      </main>
    </StreamTheme>
  );
};

export default CallPage;
