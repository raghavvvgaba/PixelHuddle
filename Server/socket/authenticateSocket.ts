import { verifyToken } from "../middleware/auth";
import type { AppSocket } from "./socketHandler";

const authenticateSocket = (
  socket: AppSocket,
  next: (error?: Error) => void,
) => {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string" || !token) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const user = verifyToken(token);
    socket.data.userId = user.userId;
    socket.data.displayName = user.username;
    next();
  } catch {
    next(new Error("Invalid or expired session"));
  }
};

export default authenticateSocket;
