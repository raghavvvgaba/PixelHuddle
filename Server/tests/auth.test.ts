import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth";
import authenticateSocket from "../socket/authenticateSocket";
import type { AppSocket } from "../socket/socketHandler";

describe("verifyToken", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterAll(() => {
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  test("returns the authenticated user from a valid token", () => {
    const token = jwt.sign(
      { userId: "user-123", username: "Ada" },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" },
    );

    expect(verifyToken(token)).toMatchObject({
      userId: "user-123",
      username: "Ada",
    });
  });

  test("rejects a token without the required identity", () => {
    const token = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET!);

    expect(() => verifyToken(token)).toThrow("Invalid token payload");
  });

  test("rejects an expired token", () => {
    const token = jwt.sign(
      { userId: "user-123", username: "Ada" },
      process.env.JWT_SECRET!,
      { expiresIn: -1 },
    );

    expect(() => verifyToken(token)).toThrow();
  });
});

describe("authenticateSocket", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  const runMiddleware = (auth: Record<string, unknown>) => {
    const socket = {
      handshake: { auth },
      data: {},
    } as AppSocket;
    let middlewareError: Error | undefined;

    authenticateSocket(socket, (error) => {
      middlewareError = error;
    });

    return { socket, middlewareError };
  };

  test("attaches verified identity to the socket", () => {
    const token = jwt.sign(
      { userId: "user-123", username: "Ada" },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" },
    );

    const { socket, middlewareError } = runMiddleware({ token });

    expect(middlewareError).toBeUndefined();
    expect(socket.data).toMatchObject({
      userId: "user-123",
      displayName: "Ada",
    });
  });

  test("rejects a socket without a token", () => {
    const { middlewareError } = runMiddleware({});

    expect(middlewareError?.message).toBe("Authentication required");
  });
});
