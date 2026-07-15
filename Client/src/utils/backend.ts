const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim();

const getFallbackBackendUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname || "localhost";

  return `${protocol}//${hostname}:4000`;
};

export const BACKEND_URL = configuredBackendUrl || getFallbackBackendUrl();
