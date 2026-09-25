import mongoose from "mongoose";
import Membership from "../models/Membership";
import Office from "../models/Office";
import socketHandler, { __testing, type AppServer, type AppSocket } from "../socket/socketHandler";
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

  test("normalizes the office id supplied during room join", () => {
    expect(
      normalizeJoinPayload({
        roomId: "  Demo-Room ",
      })
    ).toEqual({
      roomId: "demo-room",
    });
    expect(sanitizeDisplayName("  Sunny    Otter  ")).toBe("Sunny Otter");
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
      ["inside", createPlayer("inside", 4 * 32, 12.2 * 32)],
      ["outside", createPlayer("outside", 4 * 32, 11.7 * 32)],
    ]);

    const peers = buildConversationPeerMap("room", players);
    expect(peers.get("inside")?.has("outside")).toBe(false);
  });

  test.each([
    ["Focus Room", [1 * 32, 13 * 32], [8.3 * 32, 17 * 32]],
    ["Boardroom", [10.6 * 32, 15 * 32], [18 * 32, 21 * 32]],
  ])("connects occupants across the whole %s", (_room, first, second) => {
    const players = new Map([
      ["a", createPlayer("a", first[0]!, first[1]!)],
      ["b", createPlayer("b", second[0]!, second[1]!)],
    ]);

    const peers = buildConversationPeerMap("room", players);
    expect(peers.get("a")?.has("b")).toBe(true);
    expect(peers.get("b")?.has("a")).toBe(true);
  });

  test("keeps a boardroom occupant separate from someone just outside its doorway", () => {
    const players = new Map([
      ["inside", createPlayer("inside", 14 * 32, 14.8 * 32)],
      ["outside", createPlayer("outside", 14 * 32, 14.2 * 32)],
    ]);

    expect(buildConversationPeerMap("room", players).get("inside")?.has("outside")).toBe(false);
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

describe("office presence", () => {
  afterEach(() => jest.restoreAllMocks());

  test("a new tab replaces the previous avatar for the same account", async () => {
    const roomId = new mongoose.Types.ObjectId().toString();
    jest.spyOn(Office, "exists").mockResolvedValue({ _id: roomId } as never);
    jest.spyOn(Membership, "exists").mockResolvedValue({ _id: "membership" } as never);

    const sockets = new Map<string, AppSocket>();
    let onConnection: ((socket: AppSocket) => void) | undefined;
    const broadcasts: Array<{ eventName: string; payload: unknown }> = [];
    const io = {
      sockets: { sockets },
      on: (_eventName: string, handler: (socket: AppSocket) => void) => { onConnection = handler; },
      to: () => ({ emit: (eventName: string, payload: unknown) => broadcasts.push({ eventName, payload }) }),
    } as unknown as AppServer;
    socketHandler(io);

    const makeSession = (id: string, userId = "same-user") => {
      const handlers = new Map<string, (payload: { roomId: string }) => Promise<void>>();
      const emitted: EmittedEvent[] = [];
      const session = {
        id,
        data: { userId, displayName: "Alex", roomId: null },
        on: (eventName: string, handler: (payload: { roomId: string }) => Promise<void>) => { handlers.set(eventName, handler); },
        emit: (eventName: string, payload: unknown) => { emitted.push({ eventName, payload }); },
        to: () => ({ emit: (eventName: string, payload: unknown) => broadcasts.push({ eventName, payload }) }),
        join: async () => undefined,
        leave: () => undefined,
      } as unknown as AppSocket;
      sockets.set(id, session);
      onConnection?.(session);
      return { session, handlers, emitted };
    };

    const observer = makeSession("observer", "other-user");
    await observer.handlers.get("join-room")?.({ roomId });
    const first = makeSession("first-tab");
    await first.handlers.get("join-room")?.({ roomId });
    const second = makeSession("second-tab");
    await second.handlers.get("join-room")?.({ roomId });

    const latestState = second.emitted.filter((event) => event.eventName === "room-state").at(-1);
    expect(latestState?.payload).toMatchObject({
      players: [
        { socketId: "observer", userId: "other-user" },
        { socketId: "second-tab", userId: "same-user" },
      ],
    });
    expect(first.session.data.roomId).toBeNull();
    expect(first.emitted).toContainEqual(expect.objectContaining({ eventName: "room-access-denied" }));
    expect(broadcasts.filter((event) => event.eventName === "room-state").at(-1)?.payload).toEqual(latestState?.payload);
  });
});
