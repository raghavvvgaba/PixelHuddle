import { io, type Socket } from "socket.io-client";
import { BACKEND_URL } from "./utils/backend";
import type { ClientToServerEvents, ServerToClientEvents } from "../../Shared/realtime";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(BACKEND_URL, {
  autoConnect: false,
});

export default socket;
