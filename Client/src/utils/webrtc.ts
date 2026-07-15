const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

const splitUrls = (value?: string) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const createIceServers = (): RTCIceServer[] => {
  const stunUrls = splitUrls(import.meta.env.VITE_STUN_URLS);
  const turnUrls = splitUrls(import.meta.env.VITE_TURN_URLS);
  const iceServers: RTCIceServer[] = [
    {
      urls: stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_URLS,
    },
  ];

  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls,
      username: import.meta.env.VITE_TURN_USERNAME || "",
      credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
    });
  }

  return iceServers;
};

export const getCallErrorMessage = (error: unknown): string => {
  if (!error) {
    return "Something went wrong while starting the call.";
  }

  if (error instanceof Error) {
    if (error.message) {
      return error.message;
    }
  }

  const errorName = typeof error === "object" && error && "name" in error
    ? String(error.name)
    : "";

  switch (errorName) {
    case "NotAllowedError":
      return "Camera and microphone permission was denied.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera or microphone was found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "Your camera or microphone is already being used by another app.";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "This device could not satisfy the requested camera settings.";
    case "SecurityError":
      return "Camera and microphone access requires HTTPS or localhost.";
    default:
      return "Something went wrong while starting the call.";
  }
};

export const getParticipantLabel = (socketId?: string | null, selfSocketId?: string | null) => {
  if (!socketId) return "Participant";
  if (socketId === selfSocketId) return "You";
  return `Participant ${socketId.slice(0, 6)}`;
};

export const isSecureMediaContext = () => {
  if (typeof window === "undefined") return true;

  return window.isSecureContext;
};
