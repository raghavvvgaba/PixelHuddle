require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Import configurations and middleware
const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { noSQLInjectionProtection, inputSanitization } = require('./middleware/security');
const { generalLimiter } = require('./middleware/rateLimiter');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === "true" || process.env.CORS_ORIGINS === "*";
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
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

const corsOptions = {
  origin(origin, callback) {
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

const io = new Server(server, {
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

app.get("/", (req, res) => {
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Server running on port ${PORT} (0.0.0.0)`);
});
