import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  FaExclamationTriangle,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhone,
  FaPhoneSlash,
  FaUserFriends,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { getParticipantLabel } from "../utils/webrtc";
import type { IncomingCallRequest, Player } from "../../../Shared/realtime";

type CallPhase = "idle" | "error" | "acquiring-media" | "outgoing" | "incoming" | "connecting" | "connected";

interface RoomCallOverlayProps {
  selfSocketId: string | null;
  otherParticipants: Player[];
  availablePeer: Player | null;
  activePeerId: string | null;
  incomingCall: IncomingCallRequest | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callPhase: CallPhase;
  callError: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  startCall: (targetSocketId: string) => void;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
  endCall: (reason?: "hangup") => void;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  clearCallError: () => void;
}

const attachStream = async (
  element: HTMLVideoElement | null,
  stream: MediaStream | null,
  setNeedsManualPlayback: (needsPlayback: boolean) => void,
) => {
  if (!element) return;

  element.srcObject = stream || null;
  if (!stream) return;

  try {
    await element.play();
    setNeedsManualPlayback(false);
  } catch {
    setNeedsManualPlayback(true);
  }
};

export default function RoomCallOverlay({
  selfSocketId,
  otherParticipants,
  availablePeer,
  activePeerId,
  incomingCall,
  localStream,
  remoteStream,
  callPhase,
  callError,
  audioEnabled,
  videoEnabled,
  startCall,
  acceptIncomingCall,
  declineIncomingCall,
  endCall,
  toggleMicrophone,
  toggleCamera,
  clearCallError,
}: RoomCallOverlayProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [needsManualPlayback, setNeedsManualPlayback] = useState(false);

  useEffect(() => {
    void attachStream(remoteVideoRef.current, remoteStream, setNeedsManualPlayback);
  }, [remoteStream]);

  useEffect(() => {
    void attachStream(localVideoRef.current, localStream, setNeedsManualPlayback);
  }, [localStream]);

  const resumePlayback = async () => {
    try {
      if (remoteVideoRef.current && remoteStream) {
        await remoteVideoRef.current.play();
      }

      if (localVideoRef.current && localStream) {
        await localVideoRef.current.play();
      }

      setNeedsManualPlayback(false);
    } catch (error) {
      console.error("Failed to resume media playback", error);
    }
  };

  const peerLabel = getParticipantLabel(
    activePeerId || availablePeer?.socketId || incomingCall?.fromSocketId,
    selfSocketId
  );
  const canStartCall =
    Boolean(availablePeer) && (callPhase === "idle" || callPhase === "error");
  const isConnecting = ["acquiring-media", "outgoing", "connecting"].includes(callPhase);
  const isConnected = callPhase === "connected";
  const showCallControls =
    isConnected || isConnecting || Boolean(localStream) || Boolean(remoteStream);
  const helperText =
    otherParticipants.length === 0
      ? "Waiting for another participant to join."
      : otherParticipants.length > 1 && !isConnected
        ? "Calling is limited to one other participant for this demo."
        : canStartCall
          ? "One participant is available for a direct call."
          : "Call controls will appear when one participant is available.";

  return (
    <>
      <AnimatePresence>
        {callError ? (
          <Motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-4 right-4 top-20 z-[1100] mx-auto max-w-xl rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-white backdrop-blur-xl"
          >
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-200" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-red-50">Call issue</p>
                <p className="mt-1 text-red-100/85">{callError}</p>
              </div>
              <button
                type="button"
                onClick={clearCallError}
                className="rounded-full border border-white/15 bg-white/8 px-2 py-1 text-xs text-white/85 transition hover:bg-white/14"
              >
                Dismiss
              </button>
            </div>
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-[1050]">
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 md:left-auto md:w-[26rem]">
          <Motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-[28px] border border-white/14 bg-[#11162a]/88 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          >
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(74,74,255,0.3),transparent_42%),radial-gradient(circle_at_top_right,rgba(192,97,232,0.22),transparent_38%)] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">
                    Call Dock
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    {isConnected ? `Connected with ${peerLabel}` : "Room call controls"}
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/75">
                  <FaUserFriends className="text-[11px]" />
                  <span>{otherParticipants.length} remote</span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">{helperText}</p>
            </div>

            <div className="p-4">
              <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#060916]">
                <div className="aspect-[16/10]">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(74,74,255,0.24),transparent_50%),linear-gradient(180deg,#11162a_0%,#050811_100%)] px-6 text-center">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-white/40">
                          {isConnected || isConnecting ? "Connecting" : "Preview"}
                        </p>
                        <p className="mt-3 text-xl font-semibold text-white/90">
                          {isConnecting
                            ? `Getting ${peerLabel} on the line`
                            : "Video call will appear here"}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-white/60">
                          {isConnecting
                            ? "Keep this tab open while camera, microphone, and network negotiation finish."
                            : "Start a call when one other participant is available in the room."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-xs font-medium text-white/80">
                  {remoteStream ? peerLabel : isConnecting ? "Connecting..." : "Remote video"}
                </div>

                <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-2xl border border-white/15 bg-black/55 shadow-lg">
                  {localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/6 text-[11px] uppercase tracking-[0.24em] text-white/35">
                      You
                    </div>
                  )}
                </div>
              </div>

              {needsManualPlayback ? (
                <button
                  type="button"
                  onClick={resumePlayback}
                  className="mt-3 w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/12"
                >
                  Resume media playback
                </button>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {canStartCall && availablePeer ? (
                  <button
                    type="button"
                    onClick={() => startCall(availablePeer.socketId)}
                    className="btn-base btn-primary btn-shine flex-1 gap-3"
                  >
                    <FaPhone size={14} />
                    <span>Call {getParticipantLabel(availablePeer.socketId, selfSocketId)}</span>
                  </button>
                ) : null}

                {showCallControls ? (
                  <>
                    <button
                      type="button"
                      onClick={toggleMicrophone}
                      className="icon-btn !h-12 !w-12 !rounded-2xl !bg-white/8 !text-white hover:!bg-white/14"
                      aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
                    >
                      {audioEnabled ? <FaMicrophone size={15} /> : <FaMicrophoneSlash size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="icon-btn !h-12 !w-12 !rounded-2xl !bg-white/8 !text-white hover:!bg-white/14"
                      aria-label={videoEnabled ? "Turn camera off" : "Turn camera on"}
                    >
                      {videoEnabled ? <FaVideo size={15} /> : <FaVideoSlash size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => endCall("hangup")}
                      className="btn-base btn-danger gap-3"
                    >
                      <FaPhoneSlash size={14} />
                      <span>{isConnected ? "End Call" : "Cancel"}</span>
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </Motion.div>
        </div>

        <AnimatePresence>
          {incomingCall ? (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
            >
              <Motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                className="w-full max-w-md rounded-[30px] border border-white/14 bg-[#10162b]/94 p-6 text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]"
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
                  Incoming call
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  {getParticipantLabel(incomingCall.fromSocketId, selfSocketId)} wants to connect
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Accept to share your camera and microphone in this room. You can mute or turn your camera off after connecting.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={acceptIncomingCall}
                    className="btn-base btn-primary btn-shine flex-1 gap-3"
                  >
                    <FaPhone size={14} />
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={declineIncomingCall}
                    className="btn-base btn-outline flex-1 gap-3 !bg-white/8 !text-white hover:!bg-white/12"
                  >
                    <FaPhoneSlash size={14} />
                    <span>Decline</span>
                  </button>
                </div>
              </Motion.div>
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
