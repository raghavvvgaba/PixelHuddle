import { useEffect, useRef } from "react";
import {
  FaDesktop,
  FaDoorOpen,
  FaLock,
  FaLockOpen,
  FaMicrophone,
  FaMicrophoneSlash,
  FaSatelliteDish,
  FaVideo,
  FaVideoSlash,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";

const VideoTile = ({ stream, label, muted = false, volume = 1, compact = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
    videoRef.current.volume = muted ? 0 : volume;
    void videoRef.current.play().catch(() => {});
  }, [muted, stream, volume]);

  return (
    <div className={`relative overflow-hidden bg-[#071116] ${compact ? "aspect-square" : "aspect-video"}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#174b4b,transparent_70%)] text-xl font-semibold text-white/70">
          {label.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
        {label}
      </span>
    </div>
  );
};

const ControlButton = ({ active = true, danger = false, label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
      danger
        ? "border-rose-300/25 bg-rose-400/15 text-rose-100 hover:bg-rose-400/25"
        : active
          ? "border-white/12 bg-white/10 text-white hover:bg-white/16"
          : "border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/24"
    }`}
  >
    {children}
  </button>
);

export default function SpatialConversationDock({
  identity,
  peers,
  zone,
  deafened,
  localStream,
  remoteStreams,
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  mediaError,
  mediaStatus,
  prepareMedia,
  toggleMicrophone,
  toggleCamera,
  setDeafened,
  setZoneLocked,
  startScreenShare,
  stopScreenShare,
  getPeerVolume,
  clearMediaError,
}) {
  const inConversation = peers.length > 0;
  const statusLabel = deafened
    ? "Quiet mode"
    : inConversation
      ? mediaStatus === "connected"
        ? "Live conversation"
        : "Connecting nearby"
      : zone
        ? zone.hasAccess
          ? `Inside ${zone.name}`
          : `${zone.name} is locked`
        : "Walk near someone to talk";

  return (
    <div className="pointer-events-none fixed inset-0 z-[1050] text-white">
      {mediaError ? (
        <div className="pointer-events-auto absolute left-1/2 top-20 flex w-[min(92vw,36rem)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-rose-300/25 bg-[#2a1118]/94 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Media needs attention</p>
            <p className="mt-1 text-sm leading-5 text-rose-100/75">{mediaError}</p>
          </div>
          <button type="button" onClick={clearMediaError} className="text-xs text-white/60 hover:text-white">
            Dismiss
          </button>
        </div>
      ) : null}

      <aside className="pointer-events-auto absolute bottom-4 right-4 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-cyan-100/15 bg-[#071417]/92 shadow-[0_28px_90px_-32px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        <header className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_42%)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-100/55">
                <FaSatelliteDish /> Spatial audio
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">{statusLabel}</h2>
            </div>
            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${inConversation && !deafened ? "animate-pulse bg-emerald-300" : "bg-white/25"}`} />
          </div>

          {zone ? (
            <div className={`mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${zone.hasAccess ? "border-amber-200/15 bg-amber-200/8" : "border-rose-200/20 bg-rose-300/10"}`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <FaDoorOpen className="shrink-0 text-amber-200" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{zone.name}</p>
                  <p className="text-[11px] text-white/50">
                    {zone.isLocked ? "Private area locked" : "Private area open"}
                  </p>
                </div>
              </div>
              {zone.hasAccess && (!zone.isLocked || zone.isLockOwner) ? (
                <button
                  type="button"
                  onClick={() => setZoneLocked(!zone.isLocked)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-medium hover:bg-white/14"
                >
                  {zone.isLocked ? <FaLockOpen /> : <FaLock />}
                  {zone.isLocked ? "Unlock" : "Lock"}
                </button>
              ) : null}
            </div>
          ) : null}
        </header>

        {inConversation ? (
          <div className={`grid gap-px bg-white/8 ${peers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {peers.map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={remoteStreams[peer.socketId]}
                label={peer.displayName || "Guest"}
                volume={getPeerVolume(peer.socketId)}
                compact={peers.length > 1}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-5">
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-cyan-100/15 bg-cyan-100/[0.035] px-4 py-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/10">
                <div className="absolute inset-0 animate-ping rounded-full border border-cyan-200/15" />
                <FaVolumeUp className="text-cyan-100" />
              </div>
              <div>
                <p className="text-sm font-medium">Your conversation radius is active</p>
                <p className="mt-1 text-xs leading-5 text-white/50">
                  Move close to a teammate, or step inside a marked private area.
                </p>
              </div>
            </div>
          </div>
        )}

        <footer className="flex items-center gap-2 border-t border-white/8 px-4 py-3">
          <div className="mr-auto min-w-0">
            <p className="truncate text-xs font-semibold">{identity.displayName}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/35">
              {localStream ? "Devices ready" : "Devices off"}
            </p>
          </div>

          {!localStream ? (
            <button
              type="button"
              onClick={() => void prepareMedia()}
              className="mr-1 rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-200/16"
            >
              Enable devices
            </button>
          ) : null}

          <ControlButton active={audioEnabled} label={audioEnabled ? "Mute microphone" : "Unmute microphone"} onClick={toggleMicrophone}>
            {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </ControlButton>
          <ControlButton active={videoEnabled} label={videoEnabled ? "Turn camera off" : "Turn camera on"} onClick={toggleCamera}>
            {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
          </ControlButton>
          <ControlButton active={!deafened} danger={deafened} label={deafened ? "Resume nearby audio" : "Enter quiet mode"} onClick={() => setDeafened(!deafened)}>
            {deafened ? <FaVolumeMute /> : <FaVolumeUp />}
          </ControlButton>
          <ControlButton active={!isScreenSharing} label={isScreenSharing ? "Stop screen sharing" : "Share screen"} onClick={() => void (isScreenSharing ? stopScreenShare() : startScreenShare())}>
            <FaDesktop />
          </ControlButton>
        </footer>
      </aside>

      {localStream && inConversation ? (
        <div className="pointer-events-auto absolute bottom-4 left-4 w-28 overflow-hidden rounded-2xl border border-white/12 bg-[#071116] shadow-2xl">
          <VideoTile stream={localStream} label="You" muted compact />
        </div>
      ) : null}
    </div>
  );
}
