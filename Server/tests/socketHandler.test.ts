import { __testing, type AppServer, type AppSocket } from "../socket/socketHandler";
import type { Player, SocketData } from "../../Shared/realtime";
import {
  MAX_SPATIAL_PEERS,
  PROXIMITY_ENTER_DISTANCE,
  PROXIMITY_EXIT_DISTANCE,
} from "../socket/spatialConfig";

const {
  cleanupCallState,
  isSocketBusy,
  normalizeRoomId,
  resetPeerRelationship,
  validateCallParticipants,
  buildConversationPeerMap,
  normalizeJoinPayload,
  sanitizeDisplayName,
} = __testing;

interface EmittedEvent {
  eventName: string;
  payload: unknown;
}

interface MockSocket {
  id: string;
  data: SocketData;
  emitted: EmittedEvent[];
  emit: (eventName: string, payload: unknown) => void;
}

const createSocket = (id: string, roomId: string): MockSocket & AppSocket => ({
  id,
  data: {
    roomId,
    activeCallPeerId: null,
    pendingIncomingCallerId: null,
    pendingOutgoingTargetId: null,
  },
  emitted: [] as EmittedEvent[],
  emit(eventName: string, payload: unknown) {
    this.emitted.push({ eventName, payload });
  },
}) as MockSocket & AppSocket;

const createIo = (...sockets: Array<MockSocket & AppSocket>): AppServer => ({
  sockets: {
    sockets: new Map(sockets.map((socket) => [socket.id, socket])),
  },
}) as unknown as AppServer;

describe("socketHandler call helpers", () => {
  test("normalizeRoomId trims and lowercases room ids", () => {
    expect(normalizeRoomId("  DemoRoom  ")).toBe("demoroom");
    expect(normalizeRoomId("")).toBe("");
    expect(normalizeRoomId(null)).toBe("");
  });

  test("isSocketBusy ignores the current peer but detects other call state", () => {
    const socket = createSocket("caller", "room-1");
    socket.data.pendingOutgoingTargetId = "callee";

    expect(isSocketBusy(socket, "callee")).toBe(false);

    socket.data.activeCallPeerId = "someone-else";
    expect(isSocketBusy(socket, "callee")).toBe(true);
  });

  test("validateCallParticipants only returns peers from the same room", () => {
    const caller = createSocket("caller", "room-a");
    const callee = createSocket("callee", "room-a");
    const outsider = createSocket("outsider", "room-b");
    const io = createIo(caller, callee, outsider);

    expect(
      validateCallParticipants(io, caller, "ROOM-A", "callee")
    ).toMatchObject({
      normalizedRoomId: "room-a",
      targetSocket: callee,
    });

    expect(
      validateCallParticipants(io, caller, "room-a", "outsider")
    ).toMatchObject({
      normalizedRoomId: "room-a",
      targetSocket: null,
    });
  });

  test("resetPeerRelationship clears any relation to the specified peer", () => {
    const socket = createSocket("caller", "room-1");
    socket.data.activeCallPeerId = "peer";
    socket.data.pendingIncomingCallerId = "peer";
    socket.data.pendingOutgoingTargetId = "peer";

    resetPeerRelationship(socket, "peer");

    expect(socket.data.activeCallPeerId).toBeNull();
    expect(socket.data.pendingIncomingCallerId).toBeNull();
    expect(socket.data.pendingOutgoingTargetId).toBeNull();
  });

  test("cleanupCallState notifies the peer and clears both sides", () => {
    const caller = createSocket("caller", "room-1");
    const callee = createSocket("callee", "room-1");
    const io = createIo(caller, callee);

    caller.data.activeCallPeerId = callee.id;
    callee.data.activeCallPeerId = caller.id;

    cleanupCallState(io, caller, "quit-room");

    expect(caller.data.activeCallPeerId).toBeNull();
    expect(callee.data.activeCallPeerId).toBeNull();
    expect(callee.emitted).toContainEqual({
      eventName: "call-end",
      payload: {
        roomId: "room-1",
        fromSocketId: "caller",
        reason: "quit-room",
      },
    });
  });
});

describe("spatial conversation helpers", () => {
  const createPlayer = (
    socketId: string,
    x: number,
    y: number,
    overrides: Partial<Player> = {},
  ): Player => ({
    socketId,
    userId: `guest:${socketId}`,
    displayName: socketId,
    x,
    y,
    flipX: false,
    deafened: false,
    ...overrides,
  });

  test("normalizes stable identity supplied during room join", () => {
    expect(
      normalizeJoinPayload({
        roomId: "  Demo-Room ",
        userId: "guest-123",
        displayName: "  Sunny    Otter  ",
      })
    ).toEqual({
      roomId: "demo-room",
      userId: "guest-123",
      displayName: "Sunny Otter",
    });
    expect(sanitizeDisplayName(" ")).toBe("Guest");
  });

  test("connects players inside the entry radius", () => {
    const players = new Map([
      ["a", createPlayer("a", 700, 700)],
      ["b", createPlayer("b", 700 + PROXIMITY_ENTER_DISTANCE - 1, 700)],
    ]);

    const peers = buildConversationPeerMap("room", players);
    expect(peers.get("a")?.has("b")).toBe(true);
    expect(peers.get("b")?.has("a")).toBe(true);
  });

  test("uses an exit radius to prevent boundary flicker", () => {
    const players = new Map([
      ["a", createPlayer("a", 700, 700)],
      ["b", createPlayer("b", 700 + PROXIMITY_EXIT_DISTANCE - 1, 700)],
    ]);
    const previousPeers = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["a"])],
    ]);

    expect(buildConversationPeerMap("room", players, previousPeers).get("a")?.has("b")).toBe(true);
    players.get("b")!.x = 700 + PROXIMITY_EXIT_DISTANCE + 1;
    expect(buildConversationPeerMap("room", players, previousPeers).get("a")?.has("b")).toBe(false);
  });

  test("isolates a private-zone occupant from people outside", () => {
    const players = new Map([
      ["inside", createPlayer("inside", 80, 430)],
      ["outside", createPlayer("outside", 80, 400)],
    ]);

    const peers = buildConversationPeerMap("room", players);
    expect(peers.get("inside")?.has("outside")).toBe(false);
  });

  test("bounds the prototype mesh to three peers per participant", () => {
    const players = new Map(
      Array.from({ length: 6 }, (_, index) => [
        `player-${index}`,
        createPlayer(`player-${index}`, 700 + index, 700),
      ])
    );

    const peers = buildConversationPeerMap("room", players);
    peers.forEach((peerIds: Set<string>) => {
      expect(peerIds.size).toBeLessThanOrEqual(MAX_SPATIAL_PEERS);
    });
  });
});
