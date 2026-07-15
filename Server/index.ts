import 'dotenv/config';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors, { type CorsOptions } from "cors";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../Shared/realtime";

// Import configurations and middleware
import connectDB from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { noSQLInjectionProtection, inputSanitization } from './middleware/security';
import { generalLimiter } from './middleware/rateLimiter';
import socketHandler from './socket/socketHandler';

const app = express();
const server = http.createServer(app);
const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === "true" || process.env.CORS_ORIGINS === "*";
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin?: string) => {
  if (allowAllOrigins) return true;
  if (!origin) return true;

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) {
      return true;
    }

    if (!allowedOrigin.includes("*")) {
      return false;
    }

    const escapedPattern = allowedOrigin
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");

    return new RegExp(`^${escapedPattern}$`).test(origin);
  });
};

const corsOptions: CorsOptions = {
  origin(origin: string | undefined, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "OPTIONS"],
};

const expressCorsOrigin = allowAllOrigins ? true : corsOptions.origin;
const socketCorsOrigin = allowAllOrigins ? "*" : corsOptions.origin;

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    ...corsOptions,
    origin: socketCorsOrigin,
  },
});

// Database connection
connectDB();

// Middleware
app.set("trust proxy", 1);
app.use(cors({
  ...corsOptions,
  origin: expressCorsOrigin,
}));
app.use(express.json());
app.use(noSQLInjectionProtection);
app.use(inputSanitization);
app.use(generalLimiter);

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Metameet backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io
socketHandler(io);

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Server running on port ${PORT} (0.0.0.0)`);
});
