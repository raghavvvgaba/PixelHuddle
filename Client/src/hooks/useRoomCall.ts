import { useEffect, useRef, useState } from "react";
import socket from "../socket";
import {
  createIceServers,
  getCallErrorMessage,
  isSecureMediaContext,
} from "../utils/webrtc";
import type {
  CallReason,
  IncomingCallEnd,
  IncomingCallRequest,
  IncomingCallResponse,
  IncomingIceCandidate,
  IncomingWebRtcDescription,
  Player,
} from "../../../Shared/realtime";

type CallPhase = "idle" | "error" | "acquiring-media" | "outgoing" | "incoming" | "connecting" | "connected";
type IncomingCall = Pick<IncomingCallRequest, "fromSocketId">;

interface RoomCallOptions {
  roomId?: string;
  selfSocketId: string | null;
  participants: Player[];
}

interface ResetCallOptions {
  errorMessage?: string;
  stopMedia?: boolean;
}

const getResponseErrorMessage = (reason?: CallReason) => {
  switch (reason) {
    case "busy":
      return "The other participant is already in another call.";
    case "declined":
      return "The call was declined.";
    case "unavailable":
      return "The other participant is no longer available.";
    case "media-error":
      return "The other participant could not access their camera or microphone.";
    default:
      return "";
  }
};

const getCallEndMessage = (reason?: CallReason) => {
  switch (reason) {
    case "disconnect":
      return "The other participant disconnected.";
    case "quit-room":
      return "The other participant left the room.";
    default:
      return "";
  }
};

export default function useRoomCall({ roomId, selfSocketId, participants }: RoomCallOptions) {
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [callError, setCallError] = useState("");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerSocketIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const phaseRef = useRef<CallPhase>("idle");
  const incomingCallerIdRef = useRef<string | null>(null);
  const activePeerIdRef = useRef<string | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const politeRef = useRef(false);

  useEffect(() => {
    phaseRef.current = callPhase;
  }, [callPhase]);

  useEffect(() => {
    incomingCallerIdRef.current = incomingCall?.fromSocketId || null;
  }, [incomingCall]);

  useEffect(() => {
    activePeerIdRef.current = activePeerId || null;
  }, [activePeerId]);

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    localStreamRef.current = null;
    setLocalStream(null);
    setAudioEnabled(true);
    setVideoEnabled(true);
  };

  const destroyPeerConnection = () => {
    const peerConnection = peerConnectionRef.current;
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onnegotiationneeded = null;
      peerConnection.onconnectionstatechange = null;

      try {
        peerConnection.close();
      } catch (error) {
        console.error("Failed to close peer connection", error);
      }
    }

    peerConnectionRef.current = null;
    peerSocketIdRef.current = null;
    remoteStreamRef.current = null;
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    isSettingRemoteAnswerPendingRef.current = false;
    politeRef.current = false;
  };

  const resetCallUi = ({ errorMessage = "" }: ResetCallOptions = {}) => {
    setIncomingCall(null);
    setActivePeerId(null);
    setCallPhase("idle");
    setCallError(errorMessage);
  };

  const resetCallSession = ({ errorMessage = "", stopMedia = true }: ResetCallOptions = {}) => {
    destroyPeerConnection();
    if (stopMedia) {
      stopLocalStream();
    }
    resetCallUi({ errorMessage });
  };

  const ensureLocalStream = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!isSecureMediaContext()) {
      throw new Error("Camera and microphone access requires HTTPS or localhost.");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera and microphone access.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setAudioEnabled(stream.getAudioTracks().every((track) => track.enabled));
    setVideoEnabled(stream.getVideoTracks().every((track) => track.enabled));
    return stream;
  };

  const flushPendingCandidates = async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || pendingCandidatesRef.current.length === 0) {
      return;
    }

    const queuedCandidates = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of queuedCandidates) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to apply queued ICE candidate", error);
      }
    }
  };

  const ensurePeerConnection = async (peerSocketId: string) => {
    if (peerConnectionRef.current && peerSocketIdRef.current === peerSocketId) {
      return peerConnectionRef.current;
    }

    destroyPeerConnection();

    const peerConnection = new RTCPeerConnection({
      iceServers: createIceServers(),
    });

    politeRef.current = (selfSocketId || socket.id || "") > peerSocketId;
    peerConnectionRef.current = peerConnection;
    peerSocketIdRef.current = peerSocketId;
    setActivePeerId(peerSocketId);

    peerConnection.ontrack = (event) => {
      const [incomingStream] = event.streams;

      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
        return;
      }

      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        setRemoteStream(remoteStreamRef.current);
      }

      const currentRemoteStream = remoteStreamRef.current;
      currentRemoteStream.addTrack(event.track);
      setRemoteStream(currentRemoteStream);
    };

    peerConnection.onicecandidate = ({ candidate }) => {
      if (!candidate || !roomId || !peerSocketIdRef.current) return;

      socket.emit("webrtc-ice-candidate", {
        roomId,
        targetSocketId: peerSocketIdRef.current,
        candidate,
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        setCallPhase("connected");
        setCallError("");
        return;
      }

      if (["failed", "disconnected", "closed"].includes(peerConnection.connectionState)) {
        const errorMessage =
          peerConnection.connectionState === "failed"
            ? "The call connection failed."
            : "";

        resetCallSession({
          errorMessage,
          stopMedia: true,
        });
      }
    };

    peerConnection.onnegotiationneeded = async () => {
      if (!roomId || !peerSocketIdRef.current) return;

      try {
        makingOfferRef.current = true;
        await peerConnection.setLocalDescription();
        if (!peerConnection.localDescription) return;

        socket.emit("webrtc-description", {
          roomId,
          targetSocketId: peerSocketIdRef.current,
          description: peerConnection.localDescription,
        });

        setCallPhase((currentPhase) =>
          currentPhase === "connected" ? currentPhase : "connecting"
        );
      } catch (error) {
        console.error("Failed during negotiation", error);
        resetCallSession({
          errorMessage: "The call negotiation failed.",
          stopMedia: true,
        });
      } finally {
        makingOfferRef.current = false;
      }
    };

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    }

    await flushPendingCandidates();
    return peerConnection;
  };

  const handleRemoteDescription = async ({ roomId: incomingRoomId, fromSocketId, description }: IncomingWebRtcDescription) => {
    if (!description || !fromSocketId || incomingRoomId !== roomId) {
      return;
    }

    if (!localStreamRef.current) {
      resetCallSession({
        errorMessage: "Media was not ready when the call tried to connect.",
        stopMedia: true,
      });
      return;
    }

    const peerConnection = await ensurePeerConnection(fromSocketId);
    const readyForOffer =
      !makingOfferRef.current &&
      (peerConnection.signalingState === "stable" ||
        isSettingRemoteAnswerPendingRef.current);
    const offerCollision = description.type === "offer" && !readyForOffer;

    ignoreOfferRef.current = !politeRef.current && offerCollision;
    if (ignoreOfferRef.current) {
      return;
    }

    try {
      isSettingRemoteAnswerPendingRef.current = description.type === "answer";
      await peerConnection.setRemoteDescription(description);
      isSettingRemoteAnswerPendingRef.current = false;

      await flushPendingCandidates();

      if (description.type === "offer") {
        await peerConnection.setLocalDescription();
        if (!peerConnection.localDescription || !roomId) return;

        socket.emit("webrtc-description", {
          roomId,
          targetSocketId: fromSocketId,
          description: peerConnection.localDescription,
        });
      }

      setCallPhase((currentPhase) =>
        currentPhase === "connected" ? currentPhase : "connecting"
      );
    } catch (error) {
      console.error("Failed to handle remote description", error);
      resetCallSession({
        errorMessage: "The call handshake failed.",
        stopMedia: true,
      });
    } finally {
      isSettingRemoteAnswerPendingRef.current = false;
    }
  };

  const handleRemoteCandidate = async ({ roomId: incomingRoomId, fromSocketId, candidate }: IncomingIceCandidate) => {
    if (!candidate || !fromSocketId || incomingRoomId !== roomId) {
      return;
    }

    if (!peerConnectionRef.current || peerSocketIdRef.current !== fromSocketId) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (error) {
      if (!ignoreOfferRef.current) {
        console.error("Failed to add ICE candidate", error);
      }
    }
  };

  const startCall = async (targetSocketId: string) => {
    if (!roomId || !targetSocketId) return;

    setCallError("");
    setIncomingCall(null);
    setActivePeerId(targetSocketId);
    setCallPhase("acquiring-media");

    try {
      await ensureLocalStream();
      setCallPhase("outgoing");

      socket.emit("call-request", {
        roomId,
        targetSocketId,
      });
    } catch (error) {
      resetCallSession({
        errorMessage: getCallErrorMessage(error),
        stopMedia: true,
      });
    }
  };

  const acceptIncomingCall = async () => {
    if (!roomId || !incomingCallerIdRef.current) return;

    setCallError("");
    setCallPhase("acquiring-media");

    try {
      await ensureLocalStream();
      await ensurePeerConnection(incomingCallerIdRef.current);
      setCallPhase("connecting");

      socket.emit("call-response", {
        roomId,
        targetSocketId: incomingCallerIdRef.current,
        accepted: true,
      });
    } catch (error) {
      socket.emit("call-response", {
        roomId,
        targetSocketId: incomingCallerIdRef.current,
        accepted: false,
        reason: "media-error",
      });

      resetCallSession({
        errorMessage: getCallErrorMessage(error),
        stopMedia: true,
      });
    }
  };

  const declineIncomingCall = () => {
    if (!roomId || !incomingCallerIdRef.current) {
      resetCallUi();
      return;
    }

    socket.emit("call-response", {
      roomId,
      targetSocketId: incomingCallerIdRef.current,
      accepted: false,
      reason: "declined",
    });

    resetCallUi();
  };

  const endCall = (reason: CallReason = "hangup") => {
    const targetSocketId =
      peerSocketIdRef.current ||
      incomingCallerIdRef.current ||
      activePeerIdRef.current;

    if (roomId && targetSocketId) {
      socket.emit("call-end", {
        roomId,
        targetSocketId,
        reason,
      });
    }

    resetCallSession({
      errorMessage: "",
      stopMedia: true,
    });
  };

  const toggleMicrophone = () => {
    if (!localStreamRef.current) return;

    const nextEnabled = !localStreamRef.current
      .getAudioTracks()
      .every((track) => track.enabled);

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });

    setAudioEnabled(nextEnabled);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;

    const nextEnabled = !localStreamRef.current
      .getVideoTracks()
      .every((track) => track.enabled);

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });

    setVideoEnabled(nextEnabled);
  };

  useEffect(() => {
    if (!activePeerIdRef.current) return;
    if (participants.length === 0) return;

    const activePeerStillPresent = participants.some(
      (participant) => participant.socketId === activePeerIdRef.current
    );

    if (activePeerStillPresent) return;

    resetCallSession({
      errorMessage: "The other participant left the room.",
      stopMedia: true,
    });
  }, [participants]);

  useEffect(() => {
    if (!roomId) return undefined;

    const handleCallRequest = ({ roomId: incomingRoomId, fromSocketId }: IncomingCallRequest) => {
      if (incomingRoomId !== roomId || !fromSocketId) return;

      if (phaseRef.current !== "idle" && phaseRef.current !== "error") {
        socket.emit("call-response", {
          roomId,
          targetSocketId: fromSocketId,
          accepted: false,
          reason: "busy",
        });
        return;
      }

      setCallError("");
      setActivePeerId(fromSocketId);
      setIncomingCall({ fromSocketId });
      setCallPhase("incoming");
    };

    const handleCallResponse = async ({
      roomId: incomingRoomId,
      fromSocketId,
      accepted,
      reason,
    }: IncomingCallResponse) => {
      if (incomingRoomId !== roomId || !fromSocketId) return;

      if (!accepted) {
        resetCallSession({
          errorMessage: getResponseErrorMessage(reason),
          stopMedia: true,
        });
        return;
      }

      setCallError("");
      setIncomingCall(null);
      setActivePeerId(fromSocketId);
      setCallPhase((currentPhase) =>
        currentPhase === "connected" ? currentPhase : "connecting"
      );

      try {
        await ensureLocalStream();
        await ensurePeerConnection(fromSocketId);
      } catch (error) {
        resetCallSession({
          errorMessage: getCallErrorMessage(error),
          stopMedia: true,
        });
      }
    };

    const handleIncomingDescription = (payload: IncomingWebRtcDescription) => {
      void handleRemoteDescription(payload);
    };

    const handleIncomingCandidate = (payload: IncomingIceCandidate) => {
      void handleRemoteCandidate(payload);
    };

    const handleCallEnd = ({ fromSocketId, reason }: IncomingCallEnd) => {
      if (
        fromSocketId &&
        peerSocketIdRef.current &&
        fromSocketId !== peerSocketIdRef.current &&
        fromSocketId !== incomingCallerIdRef.current
      ) {
        return;
      }

      resetCallSession({
        errorMessage: getCallEndMessage(reason),
        stopMedia: true,
      });
    };

    const handleSocketDisconnect = () => {
      if (phaseRef.current === "idle" && !incomingCallerIdRef.current) return;

      resetCallSession({
        errorMessage: "Socket connection was lost.",
        stopMedia: true,
      });
    };

    socket.on("call-request", handleCallRequest);
    socket.on("call-response", handleCallResponse);
    socket.on("webrtc-description", handleIncomingDescription);
    socket.on("webrtc-ice-candidate", handleIncomingCandidate);
    socket.on("call-end", handleCallEnd);
    socket.on("disconnect", handleSocketDisconnect);

    return () => {
      socket.off("call-request", handleCallRequest);
      socket.off("call-response", handleCallResponse);
      socket.off("webrtc-description", handleIncomingDescription);
      socket.off("webrtc-ice-candidate", handleIncomingCandidate);
      socket.off("call-end", handleCallEnd);
      socket.off("disconnect", handleSocketDisconnect);

      destroyPeerConnection();
      stopLocalStream();
    };
  }, [roomId]);

  const otherParticipants = participants.filter(
    (participant) => participant.socketId !== selfSocketId
  );
  const availablePeer =
    otherParticipants.length === 1 ? otherParticipants[0] : null;

  return {
    selfSocketId,
    participants,
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
    clearCallError: () => setCallError(""),
  };
}
