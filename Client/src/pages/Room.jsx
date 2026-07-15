import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FaCopy, FaSignOutAlt } from 'react-icons/fa';
import SpatialConversationDock from '../components/SpatialConversationDock';
import { useAuth } from '../contexts/AuthContext';
import PhaserGame from '../game/PhaserGame';
import useRoomPresence from '../hooks/useRoomPresence';
import useSpatialConversation from '../hooks/useSpatialConversation';
import useSocketStatus from '../hooks/useSocketStatus';
import { getRoomIdentity } from '../utils/identity';

const Room = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const identity = useMemo(() => getRoomIdentity(user), [user]);
  const socketStatus = useSocketStatus();
  const roomPresence = useRoomPresence(roomId, identity);
  const spatialConversation = useSpatialConversation({
    roomId,
    selfSocketId: roomPresence.selfSocketId,
    participants: roomPresence.participants,
  });

  const handleCopyRoomLink = async () => {
    if (!roomId) return;

    const roomLink = `${window.location.origin}/room/${roomId}`;

    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy room link", error);
    }
  };

  const handleQuitRoom = () => {
    roomPresence.leaveRoom();
    navigate('/dashboard');
  };

  return (
    <div className="w-screen h-screen bg-[#0f0f1a] relative overflow-hidden flex items-center justify-center">
      <div className="fixed top-4 left-4 z-[1000] flex items-center gap-2 rounded-full bg-black/35 backdrop-blur-md border border-white/15 px-3 py-2 text-sm text-white/90">
        <span>
          Room ID: <span className="font-semibold tracking-[0.2em] uppercase">{roomId}</span>
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
            socketStatus.isConnected
              ? "bg-emerald-500/20 text-emerald-100"
              : socketStatus.hasConnectionError
                ? "bg-amber-500/20 text-amber-100"
                : "bg-white/10 text-white/80"
          }`}
        >
          {socketStatus.isConnected
            ? "Live"
            : socketStatus.hasConnectionError
              ? "Offline"
              : "Connecting"}
        </span>
        <button
          type="button"
          onClick={handleCopyRoomLink}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <FaCopy size={12} />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="fixed top-4 right-4 z-[1000]">
        <Motion.button
          onClick={handleQuitRoom}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-white flex items-center justify-center hover:bg-white/15 hover:scale-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Exit room"
          type="button"
        >
          <FaSignOutAlt size={16} />
        </Motion.button>
      </div>

      <PhaserGame
        selfSocketId={roomPresence.selfSocketId}
        players={roomPresence.participants}
        onLocalPlayerMove={roomPresence.emitLocalPlayerMove}
        subscribeToRemoteMoves={roomPresence.subscribeToRemoteMoves}
        conversationPeerIds={spatialConversation.peers.map((peer) => peer.socketId)}
      />
      {socketStatus.isConnected ? (
        <SpatialConversationDock identity={identity} {...spatialConversation} />
      ) : null}

      {!socketStatus.isConnected ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/12 bg-[#11162a]/92 p-6 text-white shadow-[0_40px_120px_-50px_rgba(0,0,0,0.92)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
              Room sync unavailable
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {socketStatus.hasConnectionError ? "Backend is unreachable" : "Connecting to backend"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {socketStatus.hasConnectionError
                ? `This room only becomes real when the websocket backend is live. Right now this page cannot sync with anyone else. ${socketStatus.connectionError}`
                : "Hold on while we establish the live room connection. Movement and calling stay paused until the backend responds."}
            </p>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/55">
              Server: {socketStatus.backendUrl}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-base btn-primary flex-1"
              >
                Back to lobby
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-base btn-outline flex-1 !bg-white/8 !text-white hover:!bg-white/12"
              >
                Retry connection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Room;
