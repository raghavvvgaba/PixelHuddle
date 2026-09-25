import type { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import type {
  CallReason,
  ClientToServerEvents,
  ConversationStatePayload,
  InterServerEvents,
  JoinRoomPayload,
  Player,
  RoomStatePayload,
  ServerToClientEvents,
  SocketData,
} from "../../Shared/realtime";
import Membership from "../models/Membership";
import Office from "../models/Office";
import {
  MAX_SPATIAL_PEERS,
  PRIVATE_ZONES,
  PROXIMITY_ENTER_DISTANCE,
  PROXIMITY_EXIT_DISTANCE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getPrivateZone,
} from "./spatialConfig";

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface ZoneLock {
  lockedBy: string;
  memberIds: Set<string>;
}

interface NormalizedJoinPayload {
  roomId: string;
}

type ConversationPeerMap = Map<string, Set<string>>;

const roomPlayers = new Map<string, Map<string, Player>>();
const roomRevisions = new Map<string, number>();
const roomConversationPeers = new Map<string, ConversationPeerMap>();
const roomZoneLocks = new Map<string, Map<string, ZoneLock>>();

const normalizeRoomId = (roomId: unknown) =>
  typeof roomId === "string" ? roomId.trim().toLowerCase() : "";

const sanitizeDisplayName = (displayName: unknown) => {
  if (typeof displayName !== "string") return "Guest";
  const normalized = displayName.replace(/\s+/g, " ").trim().slice(0, 24);
  return normalized || "Guest";
};

const normalizeJoinPayload = (payload: JoinRoomPayload | string): NormalizedJoinPayload => {
  if (typeof payload === "string") {
    return { roomId: normalizeRoomId(payload) };
  }

  return { roomId: normalizeRoomId(payload?.roomId) };
};

const getAuthorizedRoomId = (socket: AppSocket, claimedRoomId?: string | null) => {
  const authorizedRoomId = normalizeRoomId(socket.data.roomId);
  const normalizedClaim = normalizeRoomId(claimedRoomId);

  if (!authorizedRoomId) return "";
  if (normalizedClaim && normalizedClaim !== authorizedRoomId) return "";
  return authorizedRoomId;
};

const canJoinOffice = async (officeId: string, userId: string) => {
  if (!mongoose.isObjectIdOrHexString(officeId)) return false;

  const [office, membership] = await Promise.all([
    Office.exists({ _id: officeId }),
    Membership.exists({ officeId, userId }),
  ]);

  return Boolean(office && membership);
};

const getDistance = (firstPlayer: Player, secondPlayer: Player) =>
  Math.hypot(firstPlayer.x - secondPlayer.x, firstPlayer.y - secondPlayer.y);

const getSpawnPoint = (playerCount: number) => {
  const spawnOffsets = [
    { x: 0, y: 0 },
    { x: 32, y: 0 },
    { x: -32, y: 0 },
    { x: 0, y: 32 },
    { x: 32, y: 32 },
    { x: -32, y: 32 },
  ];
  const baseX = 4 * 32 + 16;
  const baseY = 5 * 32 + 16;
  const offset = spawnOffsets[playerCount % spawnOffsets.length]!;

  return {
    x: Math.max(32, Math.min(WORLD_WIDTH - 32, baseX + offset.x)),
    y: Math.max(32, Math.min(WORLD_HEIGHT - 32, baseY + offset.y)),
  };
};

const getSocketById = (io: AppServer, socketId: string) => io.sockets.sockets.get(socketId);

const isSocketBusy = (socket: AppSocket | null | undefined, peerSocketId: string | null = null) => {
  if (!socket) return true;

  return [
    socket.data.activeCallPeerId,
    socket.data.pendingIncomingCallerId,
    socket.data.pendingOutgoingTargetId,
  ]
    .filter((id): id is string => Boolean(id))
    .some((id) => !peerSocketId || id !== peerSocketId);
};

const clearCallState = (socket: AppSocket | null | undefined) => {
  if (!socket) return;

  socket.data.activeCallPeerId = null;
  socket.data.pendingIncomingCallerId = null;
  socket.data.pendingOutgoingTargetId = null;
};

const ensureRoom = (roomId: string) => {
  if (!roomPlayers.has(roomId)) {
    roomPlayers.set(roomId, new Map());
  }

  if (!roomRevisions.has(roomId)) {
    roomRevisions.set(roomId, 0);
  }

  if (!roomConversationPeers.has(roomId)) {
    roomConversationPeers.set(roomId, new Map());
  }

  if (!roomZoneLocks.has(roomId)) {
    roomZoneLocks.set(roomId, new Map());
  }

  return roomPlayers.get(roomId)!;
};

const getRoomStatePayload = (roomId: string): RoomStatePayload => ({
  roomId,
  revision: roomRevisions.get(roomId) || 0,
  players: Array.from(roomPlayers.get(roomId)?.values() || []),
});

const getZoneLock = (roomId: string, zoneId: string) => roomZoneLocks.get(roomId)?.get(zoneId) || null;

const canUseZone = (roomId: string, socketId: string, zoneId: string | null) => {
  if (!zoneId) return true;
  const lock = getZoneLock(roomId, zoneId);
  return !lock || lock.memberIds.has(socketId);
};

const areSpatialPeers = (roomId: string, firstSocketId: string, secondSocketId: string) => {
  const peers = roomConversationPeers.get(roomId)?.get(firstSocketId);
  return Boolean(peers?.has(secondSocketId));
};

const shouldConnectPlayers = ({
  roomId,
  firstPlayer,
  secondPlayer,
  previousPeers,
}: {
  roomId: string;
  firstPlayer: Player;
  secondPlayer: Player;
  previousPeers: ConversationPeerMap;
}) => {
  if (firstPlayer.deafened || secondPlayer.deafened) return false;

  const firstZone = getPrivateZone(firstPlayer.x, firstPlayer.y);
  const secondZone = getPrivateZone(secondPlayer.x, secondPlayer.y);

  if (firstZone || secondZone) {
    return Boolean(
      firstZone &&
        secondZone &&
        firstZone.id === secondZone.id &&
        canUseZone(roomId, firstPlayer.socketId, firstZone.id) &&
        canUseZone(roomId, secondPlayer.socketId, secondZone.id)
    );
  }

  const wasConnected = previousPeers.get(firstPlayer.socketId)?.has(secondPlayer.socketId);
  const threshold = wasConnected ? PROXIMITY_EXIT_DISTANCE : PROXIMITY_ENTER_DISTANCE;
  return getDistance(firstPlayer, secondPlayer) <= threshold;
};

const buildConversationPeerMap = (
  roomId: string,
  players: Map<string, Player>,
  previousPeers: ConversationPeerMap = new Map(),
) => {
  const nextPeers: ConversationPeerMap = new Map(
    Array.from(players.keys(), (socketId) => [socketId, new Set<string>()]),
  );
  const playerList = Array.from(players.values());

  for (let firstIndex = 0; firstIndex < playerList.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < playerList.length; secondIndex += 1) {
      const firstPlayer = playerList[firstIndex]!;
      const secondPlayer = playerList[secondIndex]!;
      if (!shouldConnectPlayers({ roomId, firstPlayer, secondPlayer, previousPeers })) continue;
      if (nextPeers.get(firstPlayer.socketId)!.size >= MAX_SPATIAL_PEERS) continue;
      if (nextPeers.get(secondPlayer.socketId)!.size >= MAX_SPATIAL_PEERS) continue;

      nextPeers.get(firstPlayer.socketId)!.add(secondPlayer.socketId);
      nextPeers.get(secondPlayer.socketId)!.add(firstPlayer.socketId);
    }
  }

  return nextPeers;
};

const getConversationStatePayload = (
  roomId: string,
  player: Player,
  players: Map<string, Player>,
  peerIds?: Set<string>,
): ConversationStatePayload => {
  const zone = getPrivateZone(player.x, player.y);
  const lock = zone ? getZoneLock(roomId, zone.id) : null;
  const hasZoneAccess = zone ? canUseZone(roomId, player.socketId, zone.id) : true;

  return {
    roomId,
    peers: Array.from(peerIds || [])
      .map((socketId) => players.get(socketId))
      .filter((peer): peer is Player => Boolean(peer)),
    zone: zone
      ? {
          id: zone.id,
          name: zone.name,
          isLocked: Boolean(lock),
          isLockOwner: lock?.lockedBy === player.socketId,
          hasAccess: hasZoneAccess,
        }
      : null,
    deafened: Boolean(player.deafened),
  };
};

const recalculateConversations = (io: AppServer, roomId: string) => {
  const players = roomPlayers.get(roomId);
  if (!players) return;

  const previousPeers = roomConversationPeers.get(roomId) || new Map();
  const nextPeers = buildConversationPeerMap(roomId, players, previousPeers);
  roomConversationPeers.set(roomId, nextPeers);

  players.forEach((player, socketId) => {
    getSocketById(io, socketId)?.emit(
      "conversation-state",
      getConversationStatePayload(roomId, player, players, nextPeers.get(socketId))
    );
  });
};

const emitRoomState = (io: AppServer, roomId: string) => {
  if (!roomId || !roomPlayers.has(roomId)) return;

  roomRevisions.set(roomId, (roomRevisions.get(roomId) || 0) + 1);
  io.to(roomId).emit("room-state", getRoomStatePayload(roomId));
};

const emitRoomStateToSocket = (socket: AppSocket, roomId: string) => {
  if (!roomId || !roomPlayers.has(roomId)) return;

  socket.emit("room-state", getRoomStatePayload(roomId));
};

const emitJoinedRoomState = (socket: AppSocket, roomId: string) => {
  if (!roomId || !roomPlayers.has(roomId)) return;

  roomRevisions.set(roomId, (roomRevisions.get(roomId) || 0) + 1);
  const payload = getRoomStatePayload(roomId);

  socket.emit("room-state", payload);
  socket.to(roomId).emit("room-state", payload);
};

const removePlayerFromRoom = (io: AppServer, socketId: string, roomId: string | null) => {
  if (!roomId || !roomPlayers.has(roomId)) return;

  const players = roomPlayers.get(roomId)!;
  const removed = players.delete(socketId);

  if (!removed) return;

  const locks = roomZoneLocks.get(roomId);
  locks?.forEach((lock, zoneId) => {
    lock.memberIds.delete(socketId);
    if (lock.lockedBy === socketId || lock.memberIds.size === 0) {
      locks.delete(zoneId);
    }
  });

  getSocketById(io, socketId)?.leave(roomId);

  if (players.size === 0) {
    roomPlayers.delete(roomId);
    roomRevisions.delete(roomId);
    roomConversationPeers.delete(roomId);
    roomZoneLocks.delete(roomId);
    return;
  }

  emitRoomState(io, roomId);
  recalculateConversations(io, roomId);
};

const resetPeerRelationship = (socket: AppSocket | null | undefined, peerSocketId: string | null) => {
  if (!socket || !peerSocketId) return;

  if (socket.data.activeCallPeerId === peerSocketId) {
    socket.data.activeCallPeerId = null;
  }

  if (socket.data.pendingIncomingCallerId === peerSocketId) {
    socket.data.pendingIncomingCallerId = null;
  }

  if (socket.data.pendingOutgoingTargetId === peerSocketId) {
    socket.data.pendingOutgoingTargetId = null;
  }
};

const notifyPeerCallEnded = (
  peerSocket: AppSocket | null | undefined,
  socket: AppSocket,
  reason: CallReason,
) => {
  if (!peerSocket) return;

  peerSocket.emit("call-end", {
    roomId: peerSocket.data.roomId || socket.data.roomId || null,
    fromSocketId: socket.id,
    reason,
  });
};

const cleanupCallState = (io: AppServer, socket: AppSocket, reason: CallReason = "hangup") => {
  const peerSocketIds = new Set<string>(
    [
      socket.data.activeCallPeerId,
      socket.data.pendingIncomingCallerId,
      socket.data.pendingOutgoingTargetId,
    ].filter((id): id is string => Boolean(id))
  );

  peerSocketIds.forEach((peerSocketId) => {
    const peerSocket = getSocketById(io, peerSocketId);
    if (!peerSocket) return;

    resetPeerRelationship(peerSocket, socket.id);
    notifyPeerCallEnded(peerSocket, socket, reason);
  });

  clearCallState(socket);
};

const validateCallParticipants = (
  io: AppServer,
  socket: AppSocket,
  roomId: string | null | undefined,
  targetSocketId: string,
) => {
  const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
  const targetSocket = getSocketById(io, targetSocketId);

  if (!normalizedRoomId || !targetSocket || targetSocket.id === socket.id) {
    return { normalizedRoomId, targetSocket: null };
  }

  const sourceRoomId = normalizeRoomId(socket.data.roomId);
  const targetRoomId = normalizeRoomId(targetSocket.data.roomId);
  if (sourceRoomId !== normalizedRoomId || targetRoomId !== normalizedRoomId) {
    return { normalizedRoomId, targetSocket: null };
  }

  return { normalizedRoomId, targetSocket };
};

const socketHandler = (io: AppServer) => {
  io.on("connection", (socket) => {
    console.log(`[CONNECTED] ${socket.id} connected`);
    clearCallState(socket);
    socket.data.roomId = null;

    // Handle user joining a room
    socket.on('join-room', async (payload) => {
      const { roomId: normalizedRoomId } = normalizeJoinPayload(payload);
      if (!normalizedRoomId) return;
      if (!socket.data.userId || !socket.data.displayName) return;

      try {
        const isMember = await canJoinOffice(normalizedRoomId, socket.data.userId);
        if (!isMember) {
          socket.emit("room-access-denied", {
            roomId: normalizedRoomId,
            message: "This office does not exist or you are not a member.",
          });
          return;
        }
      } catch (error) {
        console.error("[ROOM] Office membership check failed", error);
        socket.emit("room-access-denied", {
          roomId: normalizedRoomId,
          message: "Office access could not be verified. Please try again.",
        });
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== normalizedRoomId) {
        cleanupCallState(io, socket, "quit-room");
        removePlayerFromRoom(io, socket.id, socket.data.roomId);
      }

      // A closed tab can remain connected until its heartbeat times out. Replace its
      // presence as soon as the same account joins this office from a new tab.
      for (const player of Array.from(roomPlayers.get(normalizedRoomId)?.values() || [])) {
        if (player.userId !== socket.data.userId || player.socketId === socket.id) continue;

        const previousSocket = getSocketById(io, player.socketId);
        if (previousSocket) {
          cleanupCallState(io, previousSocket, "quit-room");
          previousSocket.data.roomId = null;
          previousSocket.emit("room-access-denied", {
            roomId: normalizedRoomId,
            message: "This office was opened in another tab. Reload to join here instead.",
          });
        }
        removePlayerFromRoom(io, player.socketId, normalizedRoomId);
      }

      const players = ensureRoom(normalizedRoomId);
      const existingPlayer = players.get(socket.id);
      const spawnPoint = existingPlayer || getSpawnPoint(players.size);

      const player = {
        socketId: socket.id,
        userId: socket.data.userId,
        displayName: sanitizeDisplayName(socket.data.displayName),
        x: spawnPoint.x,
        y: spawnPoint.y,
        flipX: false,
        deafened: false,
      };

      players.set(socket.id, player);
      socket.data.roomId = normalizedRoomId;
      socket.data.userId = player.userId;
      socket.data.displayName = player.displayName;

      await socket.join(normalizedRoomId);
      console.log(`[ROOM] ${socket.id} joined room: ${normalizedRoomId}`);

      emitJoinedRoomState(socket, normalizedRoomId);
      recalculateConversations(io, normalizedRoomId);
    });

    socket.on("request-room-state", (roomId) => {
      const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
      if (!normalizedRoomId) return;
      if (!roomPlayers.has(normalizedRoomId)) return;

      emitRoomStateToSocket(socket, normalizedRoomId);
    });

    socket.on("request-conversation-state", (roomId) => {
      const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
      if (!normalizedRoomId) return;
      recalculateConversations(io, normalizedRoomId);
    });

    // Handle user leaving a room
    socket.on('leave-room', (roomId) => {
      const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
      if (!normalizedRoomId) return;

      cleanupCallState(io, socket, "quit-room");
      removePlayerFromRoom(io, socket.id, normalizedRoomId);
      if (socket.data.roomId === normalizedRoomId) {
        socket.data.roomId = null;
      }

      console.log(`[ROOM] ${socket.id} left room: ${normalizedRoomId}`);
    });

    socket.on("player-move", (data) => {
      const roomId = getAuthorizedRoomId(socket, data.roomId);
      if (!roomId || !roomPlayers.has(roomId)) return;

      const players = roomPlayers.get(roomId)!;
      const player = players.get(socket.id);
      if (!player) return;

      const now = Date.now();
      const nextX = Math.max(0, Math.min(WORLD_WIDTH, Number(data.x) || player.x));
      const nextY = Math.max(0, Math.min(WORLD_HEIGHT, Number(data.y) || player.y));
      const elapsed = Math.max(16, now - (player.lastMoveAt || now));
      const maxDistance = Math.max(48, elapsed * 0.45);
      const distance = Math.hypot(nextX - player.x, nextY - player.y);

      if (distance <= maxDistance) {
        player.x = nextX;
        player.y = nextY;
      } else {
        const scale = maxDistance / distance;
        player.x += (nextX - player.x) * scale;
        player.y += (nextY - player.y) * scale;
      }

      player.lastMoveAt = now;
      player.flipX = Boolean(data.flipX);

      socket.to(roomId).emit("player-moved", {
        socketId: socket.id,
        x: player.x,
        y: player.y,
        flipX: player.flipX,
      });

      recalculateConversations(io, roomId);
    });

    socket.on("set-deafened", ({ roomId, deafened }) => {
      const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
      if (!normalizedRoomId) return;
      const player = roomPlayers.get(normalizedRoomId)?.get(socket.id);
      if (!player) return;

      player.deafened = Boolean(deafened);
      recalculateConversations(io, normalizedRoomId);
    });

    socket.on("set-zone-lock", ({ roomId, zoneId, locked }) => {
      const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
      if (!normalizedRoomId) return;
      const players = roomPlayers.get(normalizedRoomId);
      const player = players?.get(socket.id);
      const zone = PRIVATE_ZONES.find((candidate) => candidate.id === zoneId);
      if (!player || !zone || getPrivateZone(player.x, player.y)?.id !== zone.id) return;

      const locks = roomZoneLocks.get(normalizedRoomId);
      if (!players || !locks) return;
      const currentLock = locks.get(zone.id);
      if (!locked) {
        if (currentLock?.lockedBy !== socket.id) return;
        locks.delete(zone.id);
      } else if (!currentLock) {
        const memberIds = new Set(
          Array.from(players.values())
            .filter((candidate) => getPrivateZone(candidate.x, candidate.y)?.id === zone.id)
            .map((candidate) => candidate.socketId)
        );
        locks.set(zone.id, { lockedBy: socket.id, memberIds });
      }

      recalculateConversations(io, normalizedRoomId);
    });

    socket.on("spatial-webrtc-description", ({ roomId, targetSocketId, description }) => {
      const { normalizedRoomId, targetSocket } = validateCallParticipants(
        io,
        socket,
        roomId,
        targetSocketId
      );
      if (!description || !targetSocket || !areSpatialPeers(normalizedRoomId, socket.id, targetSocket.id)) return;

      targetSocket.emit("spatial-webrtc-description", {
        roomId: normalizedRoomId,
        fromSocketId: socket.id,
        description,
      });
    });

    socket.on("spatial-webrtc-ice-candidate", ({ roomId, targetSocketId, candidate }) => {
      const { normalizedRoomId, targetSocket } = validateCallParticipants(
        io,
        socket,
        roomId,
        targetSocketId
      );
      if (!candidate || !targetSocket || !areSpatialPeers(normalizedRoomId, socket.id, targetSocket.id)) return;

      targetSocket.emit("spatial-webrtc-ice-candidate", {
        roomId: normalizedRoomId,
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on("call-request", ({ roomId, targetSocketId }) => {
      if (!targetSocketId || typeof targetSocketId !== "string") return;

      const { normalizedRoomId, targetSocket } = validateCallParticipants(
        io,
        socket,
        roomId,
        targetSocketId
      );

      if (!normalizedRoomId || !targetSocket) {
        socket.emit("call-response", {
          roomId: normalizedRoomId || null,
          fromSocketId: targetSocketId,
          accepted: false,
          reason: "unavailable",
        });
        return;
      }

      if (socket.data.activeCallPeerId === targetSocket.id && targetSocket.data.activeCallPeerId === socket.id) {
        socket.emit("call-response", {
          roomId: normalizedRoomId,
          fromSocketId: targetSocket.id,
          accepted: true,
        });
        return;
      }

      if (targetSocket.data.pendingOutgoingTargetId === socket.id) {
        clearCallState(socket);
        clearCallState(targetSocket);

        socket.data.activeCallPeerId = targetSocket.id;
        targetSocket.data.activeCallPeerId = socket.id;

        socket.emit("call-response", {
          roomId: normalizedRoomId,
          fromSocketId: targetSocket.id,
          accepted: true,
        });
        targetSocket.emit("call-response", {
          roomId: normalizedRoomId,
          fromSocketId: socket.id,
          accepted: true,
        });
        return;
      }

      if (isSocketBusy(socket, targetSocket.id) || isSocketBusy(targetSocket, socket.id)) {
        socket.emit("call-response", {
          roomId: normalizedRoomId,
          fromSocketId: targetSocket.id,
          accepted: false,
          reason: "busy",
        });
        return;
      }

      if (socket.data.pendingOutgoingTargetId === targetSocket.id) {
        return;
      }

      socket.data.pendingOutgoingTargetId = targetSocket.id;
      targetSocket.data.pendingIncomingCallerId = socket.id;

      targetSocket.emit("call-request", {
        roomId: normalizedRoomId,
        fromSocketId: socket.id,
      });
    });

    socket.on("call-response", ({ roomId, targetSocketId, accepted, reason }) => {
      if (!targetSocketId || typeof targetSocketId !== "string") return;

      const { normalizedRoomId, targetSocket } = validateCallParticipants(
        io,
        socket,
        roomId,
        targetSocketId
      );

      if (!normalizedRoomId || !targetSocket) return;
      if (socket.data.pendingIncomingCallerId !== targetSocket.id) return;
      if (targetSocket.data.pendingOutgoingTargetId !== socket.id) return;

      if (!accepted) {
        resetPeerRelationship(socket, targetSocket.id);
        resetPeerRelationship(targetSocket, socket.id);

        targetSocket.emit("call-response", {
          roomId: normalizedRoomId,
          fromSocketId: socket.id,
          accepted: false,
          reason: reason || "declined",
        });
        return;
      }

      clearCallState(socket);
      clearCallState(targetSocket);

      socket.data.activeCallPeerId = targetSocket.id;
      targetSocket.data.activeCallPeerId = socket.id;

      socket.emit("call-response", {
        roomId: normalizedRoomId,
        fromSocketId: targetSocket.id,
        accepted: true,
      });
      targetSocket.emit("call-response", {
        roomId: normalizedRoomId,
        fromSocketId: socket.id,
        accepted: true,
      });
    });

    socket.on("webrtc-description", ({ roomId, targetSocketId, description }) => {
      if (!description || !targetSocketId || typeof targetSocketId !== "string") return;

      const { normalizedRoomId, targetSocket } = validateCallParticipants(
        io,
        socket,
        roomId,
        targetSocketId
      );

      if (!normalizedRoomId || !targetSocket) return;
      if (socket.data.activeCallPeerId !== targetSocket.id || targetSocket.data.activeCallPeerId !== socket.id) {
        return;
      }

      targetSocket.emit("webrtc-description", {
        roomId: normalizedRoomId,
        fromSocketId: socket.id,
        description,
      });
    });

    socket.on("webrtc-ice-candidate", ({ roomId, targetSocketId, candidate }) => {
      if (!candidate || !targetSocketId || typeof targetSocketId !== "string") return;

      const { normalizedRoomId, targetSocket } = validateCallParticipants(
        io,
        socket,
        roomId,
        targetSocketId
      );

      if (!normalizedRoomId || !targetSocket) return;
      if (socket.data.activeCallPeerId !== targetSocket.id || targetSocket.data.activeCallPeerId !== socket.id) {
        return;
      }

      targetSocket.emit("webrtc-ice-candidate", {
        roomId: normalizedRoomId,
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on("call-end", ({ roomId, reason }) => {
      const normalizedRoomId = getAuthorizedRoomId(socket, roomId);
      if (!normalizedRoomId) return;

      const peerSocketIds = new Set<string>(
        [socket.data.activeCallPeerId, socket.data.pendingIncomingCallerId, socket.data.pendingOutgoingTargetId]
          .filter((id): id is string => Boolean(id))
      );

      peerSocketIds.forEach((peerSocketId) => {
        const peerSocket = getSocketById(io, peerSocketId);
        if (!peerSocket || getAuthorizedRoomId(peerSocket, normalizedRoomId) !== normalizedRoomId) return;

        resetPeerRelationship(peerSocket, socket.id);
        notifyPeerCallEnded(peerSocket, socket, reason || "hangup");
      });

      clearCallState(socket);
    });

    // Handle chat messages
    socket.on('chat-message', (data) => {
      const roomId = getAuthorizedRoomId(socket, data.roomId);
      const message = typeof data.message === "string" ? data.message.trim().slice(0, 500) : "";
      if (!roomId || !message) return;

      io.to(roomId).emit('chat-message', {
        userId: socket.data.userId || socket.id,
        username: socket.data.displayName || "Member",
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      cleanupCallState(io, socket, "disconnect");
      removePlayerFromRoom(io, socket.id, socket.data.roomId);

      console.log(`[DISCONNECTED] ${socket.id} disconnected`);
    });
  });
};

export default socketHandler;
export const __testing = {
  clearCallState,
  cleanupCallState,
  emitRoomStateToSocket,
  getRoomStatePayload,
  getSpawnPoint,
  isSocketBusy,
  normalizeRoomId,
  resetPeerRelationship,
  validateCallParticipants,
  canJoinOffice,
  getAuthorizedRoomId,
  areSpatialPeers,
  buildConversationPeerMap,
  getConversationStatePayload,
  normalizeJoinPayload,
  sanitizeDisplayName,
};
