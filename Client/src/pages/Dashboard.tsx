import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { FaArrowRight, FaPlus } from "react-icons/fa";
import AuroraBackground from "../components/AuroraBackground";
import AnimatedGrid from "../components/AnimatedGrid";
import useSocketStatus from "../hooks/useSocketStatus";
import { generateRoomId, normalizeRoomId } from "../utils/rooms";

const Dashboard = () => {
  const navigate = useNavigate();
  const [roomIdInput, setRoomIdInput] = useState("");
  const {
    backendUrl,
    connectionError,
    isConnected,
    isConnecting,
    hasConnectionError,
  } = useSocketStatus();

  const handleCreateRoom = () => {
    if (!isConnected) return;

    const roomId = generateRoomId();
    navigate(`/room/${roomId}`);
  };

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected) return;

    const normalizedRoomId = normalizeRoomId(roomIdInput);
    if (!normalizedRoomId) return;

    navigate(`/room/${normalizedRoomId}`);
  };

  return (
    <div className="relative min-h-screen bg-theme-primary text-theme-primary overflow-hidden">
      {/* Background Elements */}
      <AuroraBackground />
      <AnimatedGrid />

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-theme-secondary mb-4">
              Demo Lobby
            </p>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Create a room or join your friend
            </h1>
            <p className="text-theme-secondary max-w-2xl mx-auto">
              Use a room ID to enter the same shared space together. No login required for the demo.
            </p>
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`mb-6 rounded-2xl border px-5 py-4 backdrop-blur-xl ${
              isConnected
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"
                : hasConnectionError
                  ? "border-amber-400/25 bg-amber-500/10 text-amber-50"
                  : "border-white/10 bg-white/5 text-white/90"
            }`}
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {isConnected
                    ? "Backend connected"
                    : isConnecting
                      ? "Connecting to backend..."
                      : "Backend unavailable"}
                </p>
                <p className="text-sm opacity-80">
                  {isConnected
                    ? "Room creation and joining are live. Anyone with the same room code can sync into the same space."
                    : hasConnectionError
                      ? `Rooms are disabled until the websocket server is reachable. ${connectionError}`
                      : "Hold on while the app checks the websocket connection."}
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.24em] opacity-65">
                Server: {backendUrl}
              </p>
            </div>
          </Motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Motion.button
              onClick={handleCreateRoom}
              disabled={!isConnected}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-panel glow-border soft-shadow p-8 rounded-2xl hover:opacity-80 transition-all group text-left disabled:cursor-not-allowed disabled:opacity-55"
            >
              <div className="flex flex-col justify-between min-h-72">
                <div>
                  <div className="w-16 h-16 rounded-full bg-accent-gradient/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FaPlus size={24} className="text-accent-gradient" />
                  </div>
                  <p className="text-sm uppercase tracking-[0.25em] text-theme-secondary mb-3">
                    Create
                  </p>
                  <h2 className="text-2xl font-semibold mb-3">Start a new room</h2>
                  <p className="text-theme-secondary max-w-sm">
                    We&apos;ll generate a fresh room ID and drop you directly into a shareable room link.
                  </p>
                </div>
                <div className="inline-flex items-center gap-3 text-sm font-medium mt-8">
                  <FaPlus size={24} className="text-accent-gradient" />
                  <span>Create Room</span>
                </div>
              </div>
            </Motion.button>

            <Motion.form
              onSubmit={handleJoinRoom}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-panel glow-border soft-shadow p-8 rounded-2xl text-left"
            >
              <div className="flex flex-col justify-between min-h-72">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-theme-secondary mb-3">
                    Join
                  </p>
                  <h2 className="text-2xl font-semibold mb-3">Enter an existing room</h2>
                  <p className="text-theme-secondary max-w-sm mb-6">
                    Paste the room ID your friend shares with you and jump into the same space.
                  </p>
                  <label htmlFor="room-id" className="block text-sm font-medium mb-2">
                    Room ID
                  </label>
                  <input
                    id="room-id"
                    type="text"
                    value={roomIdInput}
                    onChange={(event) => setRoomIdInput(normalizeRoomId(event.target.value))}
                    placeholder="e.g. abc123"
                    className="w-full rounded-xl border border-theme bg-black/10 px-4 py-3 text-base placeholder-theme-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-start)]"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!roomIdInput || !isConnected}
                  className="btn-base btn-primary mt-8 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-3"
                >
                  <span>Join Room</span>
                  <FaArrowRight size={14} />
                </button>
              </div>
            </Motion.form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
