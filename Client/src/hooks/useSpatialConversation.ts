import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket";
import {
  createIceServers,
  getCallErrorMessage,
  isSecureMediaContext,
} from "../utils/webrtc";
import type {
  ConversationStatePayload,
  IncomingIceCandidate,
  IncomingWebRtcDescription,
  Player,
} from "../../../Shared/realtime";

interface SpatialConversationOptions {
  roomId?: string;
  selfSocketId: string | null;
  participants: Player[];
}

interface PeerRecord {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  settingRemoteAnswer: boolean;
  polite: boolean;
}

type Conversation = Omit<ConversationStatePayload, "roomId">;

const createEmptyConversation = (): Conversation => ({
  peers: [],
  zone: null,
  deafened: false,
});

export default function useSpatialConversation({ roomId, selfSocketId, participants }: SpatialConversationOptions) {
  const [conversation, setConversation] = useState(createEmptyConversation);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaStatus, setMediaStatus] = useState("idle");

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRecordsRef = useRef<Map<string, PeerRecord>>(new Map());
  const desiredPeerIdsRef = useRef<Set<string>>(new Set());
  const queuedCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const roomIdRef = useRef(roomId);
  const selfSocketIdRef = useRef(selfSocketId);

  useEffect(() => {
    roomIdRef.current = roomId;
    selfSocketIdRef.current = selfSocketId;
  }, [roomId, selfSocketId]);

  const prepareMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!isSecureMediaContext()) {
      throw new Error("Camera and microphone access requires HTTPS or localhost.");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera and microphone access.");
    }

    setMediaStatus("requesting");
    setMediaError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: {
          width: { ideal: 960 },
          height: { ideal: 540 },
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setAudioEnabled(stream.getAudioTracks().every((track) => track.enabled));
      setVideoEnabled(stream.getVideoTracks().every((track) => track.enabled));
      setMediaStatus("ready");
      return stream;
    } catch (error) {
      const message = getCallErrorMessage(error);
      setMediaError(message);
      setMediaStatus("error");
      throw error;
    }
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const record = peerRecordsRef.current.get(peerId);
    if (!record) return;

    record.pc.ontrack = null;
    record.pc.onicecandidate = null;
    record.pc.onnegotiationneeded = null;
    record.pc.onconnectionstatechange = null;
    record.pc.close();
    peerRecordsRef.current.delete(peerId);
    queuedCandidatesRef.current.delete(peerId);
    setRemoteStreams((current) => {
      if (!current[peerId]) return current;
      const next = { ...current };
      delete next[peerId];
      return next;
    });
  }, []);

  const ensurePeer = useCallback(async (peerId: string): Promise<PeerRecord | null> => {
    const existing = peerRecordsRef.current.get(peerId);
    if (existing) return existing;

    const stream = await prepareMedia();
    const peerCreatedWhileWaiting = peerRecordsRef.current.get(peerId);
    if (peerCreatedWhileWaiting) return peerCreatedWhileWaiting;
    if (!desiredPeerIdsRef.current.has(peerId)) return null;

    const pc = new RTCPeerConnection({ iceServers: createIceServers() });
    const record = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      settingRemoteAnswer: false,
      polite: (selfSocketIdRef.current || socket.id || "") > peerId,
    };
    peerRecordsRef.current.set(peerId, record);

    pc.ontrack = (event) => {
      const [incomingStream] = event.streams;
      if (!incomingStream) return;
      setRemoteStreams((current) => ({ ...current, [peerId]: incomingStream }));
    };

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !roomIdRef.current) return;
      socket.emit("spatial-webrtc-ice-candidate", {
        roomId: roomIdRef.current,
        targetSocketId: peerId,
        candidate,
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setMediaStatus("connected");
        setMediaError("");
      } else if (pc.connectionState === "failed") {
        setMediaError("A nearby media connection failed. Walk away and return to retry.");
        closePeer(peerId);
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        record.makingOffer = true;
        await pc.setLocalDescription();
        const activeRoomId = roomIdRef.current;
        const localDescription = pc.localDescription;
        if (!activeRoomId || !localDescription) return;
        socket.emit("spatial-webrtc-description", {
          roomId: activeRoomId,
          targetSocketId: peerId,
          description: localDescription,
        });
        setMediaStatus("connecting");
      } catch (error) {
        console.error("Spatial negotiation failed", error);
        setMediaError("Could not negotiate a nearby media connection.");
      } finally {
        record.makingOffer = false;
      }
    };

    stream.getTracks().forEach((track) => {
      const outgoingTrack =
        track.kind === "video"
          ? screenStreamRef.current?.getVideoTracks()[0] || track
          : track;
      pc.addTrack(outgoingTrack, stream);
    });

    const queuedCandidates = queuedCandidatesRef.current.get(peerId) || [];
    queuedCandidatesRef.current.delete(peerId);
    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("Could not apply a queued spatial ICE candidate", error);
      }
    }

    return record;
  }, [closePeer, prepareMedia]);

  useEffect(() => {
    if (!roomId) return undefined;

    const handleConversationState = (payload: ConversationStatePayload) => {
      if (payload.roomId !== roomId) return;
      const peers = Array.isArray(payload.peers) ? payload.peers : [];
      const desiredPeerIds = new Set(peers.map((peer) => peer.socketId).filter(Boolean));
      desiredPeerIdsRef.current = desiredPeerIds;
      setConversation({
        peers,
        zone: payload.zone || null,
        deafened: Boolean(payload.deafened),
      });

      peerRecordsRef.current.forEach((_, peerId) => {
        if (!desiredPeerIds.has(peerId)) closePeer(peerId);
      });

      if (desiredPeerIds.size === 0) {
        setMediaStatus(localStreamRef.current ? "ready" : "idle");
        return;
      }

      desiredPeerIds.forEach((peerId) => {
        void ensurePeer(peerId);
      });
    };

    const handleDescription = async ({ roomId: incomingRoomId, fromSocketId, description }: IncomingWebRtcDescription) => {
      if (incomingRoomId !== roomId || !fromSocketId || !description) return;
      if (!desiredPeerIdsRef.current.has(fromSocketId)) return;

      const record = await ensurePeer(fromSocketId);
      if (!record) return;
      const { pc } = record;
      const readyForOffer =
        !record.makingOffer &&
        (pc.signalingState === "stable" || record.settingRemoteAnswer);
      const offerCollision = description.type === "offer" && !readyForOffer;
      record.ignoreOffer = !record.polite && offerCollision;
      if (record.ignoreOffer) return;

      try {
        record.settingRemoteAnswer = description.type === "answer";
        await pc.setRemoteDescription(description);
        record.settingRemoteAnswer = false;

        if (description.type === "offer") {
          await pc.setLocalDescription();
          if (!pc.localDescription) return;
          socket.emit("spatial-webrtc-description", {
            roomId,
            targetSocketId: fromSocketId,
            description: pc.localDescription,
          });
        }
      } catch (error) {
        console.error("Could not apply a spatial session description", error);
        setMediaError("A nearby participant could not be connected.");
      } finally {
        record.settingRemoteAnswer = false;
      }
    };

    const handleCandidate = async ({ roomId: incomingRoomId, fromSocketId, candidate }: IncomingIceCandidate) => {
      if (incomingRoomId !== roomId || !fromSocketId || !candidate) return;
      const record = peerRecordsRef.current.get(fromSocketId);
      if (!record) {
        const queued = queuedCandidatesRef.current.get(fromSocketId) || [];
        queuedCandidatesRef.current.set(fromSocketId, [...queued, candidate]);
        return;
      }

      try {
        await record.pc.addIceCandidate(candidate);
      } catch (error) {
        if (!record.ignoreOffer) {
          console.error("Could not apply a spatial ICE candidate", error);
        }
      }
    };

    const handleDisconnect = () => {
      desiredPeerIdsRef.current = new Set();
      setConversation(createEmptyConversation());
      peerRecordsRef.current.forEach((_, peerId) => closePeer(peerId));
    };

    socket.on("conversation-state", handleConversationState);
    socket.on("spatial-webrtc-description", handleDescription);
    socket.on("spatial-webrtc-ice-candidate", handleCandidate);
    socket.on("disconnect", handleDisconnect);

    socket.emit("request-conversation-state", roomId);
    const peerRecords = peerRecordsRef.current;

    return () => {
      socket.off("conversation-state", handleConversationState);
      socket.off("spatial-webrtc-description", handleDescription);
      socket.off("spatial-webrtc-ice-candidate", handleCandidate);
      socket.off("disconnect", handleDisconnect);
      desiredPeerIdsRef.current = new Set();
      peerRecords.forEach((_, peerId) => closePeer(peerId));
    };
  }, [closePeer, ensurePeer, roomId]);

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const toggleMicrophone = () => {
    const stream = localStreamRef.current;
    if (!stream) {
      void prepareMedia();
      return;
    }
    const nextEnabled = !stream.getAudioTracks().every((track) => track.enabled);
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setAudioEnabled(nextEnabled);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) {
      void prepareMedia();
      return;
    }
    const nextEnabled = !stream.getVideoTracks().every((track) => track.enabled);
    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setVideoEnabled(nextEnabled);
  };

  const setDeafened = (deafened: boolean) => {
    if (!roomId) return;
    socket.emit("set-deafened", { roomId, deafened });
  };

  const setZoneLocked = (locked: boolean) => {
    if (!roomId || !conversation.zone) return;
    socket.emit("set-zone-lock", {
      roomId,
      zoneId: conversation.zone.id,
      locked,
    });
  };

  const stopScreenShare = useCallback(async () => {
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    const replacements = Array.from(peerRecordsRef.current.values()).map((record) => {
      const sender = record.pc.getSenders().find(({ track }) => track?.kind === "video");
      return sender?.replaceTrack(cameraTrack);
    });
    await Promise.allSettled(replacements);
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError("Screen sharing is not supported by this browser.");
      return;
    }

    try {
      await prepareMedia();
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = stream.getVideoTracks()[0];
      if (!screenTrack) throw new Error("Screen sharing did not provide a video track.");
      screenStreamRef.current = stream;
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      const replacements = Array.from(peerRecordsRef.current.values()).map((record) => {
        const sender = record.pc.getSenders().find(({ track }) => track?.kind === "video");
        return sender?.replaceTrack(screenTrack);
      });
      await Promise.allSettled(replacements);
      setIsScreenSharing(true);
    } catch (error) {
      const errorName = typeof error === "object" && error && "name" in error
        ? String(error.name)
        : "";
      if (errorName !== "NotAllowedError") {
        setMediaError(getCallErrorMessage(error));
      }
    }
  };

  const participantById = new Map(participants.map((participant) => [participant.socketId, participant]));
  const selfParticipant = selfSocketId ? participantById.get(selfSocketId) || null : null;
  const getPeerVolume = (peerId: string) => {
    if (conversation.zone || !selfParticipant) return 1;
    const peer = participantById.get(peerId);
    if (!peer) return 1;
    const distance = Math.hypot(peer.x - selfParticipant.x, peer.y - selfParticipant.y);
    return Math.max(0.18, Math.min(1, 1 - distance / 260));
  };

  return {
    ...conversation,
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
    clearMediaError: () => setMediaError(""),
  };
}
