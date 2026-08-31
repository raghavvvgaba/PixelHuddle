import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket";
import type {
  Player,
  PlayerMovePayload,
  PlayerMovedPayload,
  RoomAccessDeniedPayload,
  RoomStatePayload,
} from "../../../Shared/realtime";

type RemoteMoveListener = (move: PlayerMovedPayload) => void;

export default function useRoomPresence(
  roomId: string | undefined,
) {
  const [selfSocketId, setSelfSocketId] = useState(socket.id || null);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [roomRevision, setRoomRevision] = useState(-1);
  const [accessError, setAccessError] = useState("");

  const latestRoomRevisionRef = useRef(-1);
  const leftRoomRef = useRef(false);
  const remoteMoveListenersRef = useRef<Set<RemoteMoveListener>>(new Set());

  const emitJoin = useCallback((targetRoomId: string) => {
    if (!targetRoomId) return;

    leftRoomRef.current = false;
    setAccessError("");
    socket.emit("join-room", { roomId: targetRoomId });
    socket.emit("request-room-state", targetRoomId);
  }, []);

  const emitLeave = (targetRoomId?: string) => {
    if (!targetRoomId || leftRoomRef.current) return;

    leftRoomRef.current = true;
    latestRoomRevisionRef.current = -1;
    setRoomRevision(-1);
    setParticipants([]);
    socket.emit("leave-room", targetRoomId);
  };

  useEffect(() => {
    if (!roomId) return undefined;

    const handleConnect = () => {
      setSelfSocketId(socket.id || null);
      latestRoomRevisionRef.current = -1;
      setRoomRevision(-1);
      emitJoin(roomId);
    };

    const handleDisconnect = () => {
      setSelfSocketId(null);
      latestRoomRevisionRef.current = -1;
      setRoomRevision(-1);
      setParticipants([]);
    };

    const handleRoomState = ({ roomId: incomingRoomId, revision = 0, players = [] }: RoomStatePayload) => {
      if (incomingRoomId !== roomId) return;
      if (revision < latestRoomRevisionRef.current) return;

      setAccessError("");
      latestRoomRevisionRef.current = revision;
      leftRoomRef.current = false;
      setSelfSocketId(socket.id || null);
      setRoomRevision(revision);
      setParticipants(players);
    };

    const handleAccessDenied = ({ roomId: deniedRoomId, message }: RoomAccessDeniedPayload) => {
      if (deniedRoomId !== roomId) return;
      setAccessError(message || "You no longer have access to this office.");
      setParticipants([]);
    };

    const handlePlayerMoved = (move: PlayerMovedPayload) => {
      remoteMoveListenersRef.current.forEach((listener) => {
        listener(move);
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room-access-denied", handleAccessDenied);
    socket.on("room-state", handleRoomState);
    socket.on("player-moved", handlePlayerMoved);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room-access-denied", handleAccessDenied);
      socket.off("room-state", handleRoomState);
      socket.off("player-moved", handlePlayerMoved);
      emitLeave(roomId);
    };
  }, [emitJoin, roomId]);

  useEffect(() => {
    if (!roomId) return undefined;

    const handleBeforeUnload = () => {
      emitLeave(roomId);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId]);

  const subscribeToRemoteMoves = (listener: RemoteMoveListener) => {
    remoteMoveListenersRef.current.add(listener);

    return () => {
      remoteMoveListenersRef.current.delete(listener);
    };
  };

  const emitLocalPlayerMove = ({ x, y, flipX }: Omit<PlayerMovePayload, "roomId">) => {
    if (!roomId || !selfSocketId) return;

    socket.emit("player-move", {
      roomId,
      x,
      y,
      flipX,
    });
  };

  const leaveRoom = () => {
    emitLeave(roomId);
  };

  return {
    selfSocketId,
    participants,
    roomRevision,
    accessError,
    subscribeToRemoteMoves,
    emitLocalPlayerMove,
    leaveRoom,
  };
}
