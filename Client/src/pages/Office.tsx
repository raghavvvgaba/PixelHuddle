import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { FaCopy, FaSignOutAlt, FaUserPlus } from "react-icons/fa";
import type { Player, RoomIdentity } from "../../../Shared/realtime";
import {
  createInvitation,
  getApiErrorMessage,
  getOffice,
  type Office as OfficeRecord,
} from "../api/offices";
import SpatialConversationDock from "../components/SpatialConversationDock";
import { useAuth } from "../contexts/AuthContext";
import PhaserGame from "../game/PhaserGame";
import useRoomPresence from "../hooks/useRoomPresence";
import useSocketStatus from "../hooks/useSocketStatus";
import useSpatialConversation from "../hooks/useSpatialConversation";

interface OfficeWorldProps {
  office: OfficeRecord;
}

const OfficeWorld = ({ office }: OfficeWorldProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationLink, setInvitationLink] = useState("");
  const [invitationExpiry, setInvitationExpiry] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const socketStatus = useSocketStatus();
  const roomPresence = useRoomPresence(office.id);
  const spatialConversation = useSpatialConversation({
    roomId: office.id,
    selfSocketId: roomPresence.selfSocketId,
    participants: roomPresence.participants,
  });
  const identity: Required<RoomIdentity> = {
    userId: user?.id || "",
    displayName: user?.username || "Member",
  };

  const copyInvitation = async (link = invitationLink) => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setInviteError("The link is ready below, but your browser blocked automatic copying.");
    }
  };

  const handleCreateInvitation = async () => {
    if (isCreatingInvite) return;
    setInviteError("");
    setIsCreatingInvite(true);

    try {
      const invitation = await createInvitation(office.slug);
      const link = `${window.location.origin}/invitations/${invitation.token}`;
      setInvitationLink(link);
      setInvitationExpiry(invitation.expiresAt);
      await copyInvitation(link);
    } catch (requestError) {
      setInviteError(getApiErrorMessage(requestError, "We could not create an invitation."));
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleExit = () => {
    roomPresence.leaveRoom();
    navigate("/dashboard");
  };

  const blockingError = roomPresence.accessError || (socketStatus.hasConnectionError ? socketStatus.connectionError : "");

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#0f0f1a]">
      <div className="fixed left-16 top-3 z-[1000] flex max-w-[calc(100vw-8rem)] items-center gap-2 rounded-[20px] border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/90 shadow-xl backdrop-blur-xl lg:left-24">
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-semibold">{office.name}</p>
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/45">{office.role}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] ${
            socketStatus.isConnected
              ? "bg-emerald-500/20 text-emerald-100"
              : socketStatus.hasConnectionError
                ? "bg-amber-500/20 text-amber-100"
                : "bg-white/10 text-white/70"
          }`}
        >
          {socketStatus.isConnected ? "Live" : socketStatus.hasConnectionError ? "Offline" : "Connecting"}
        </span>
        {office.role === "admin" ? (
          <button
            type="button"
            onClick={handleCreateInvitation}
            disabled={isCreatingInvite}
            className="hidden items-center gap-2 rounded-full bg-cyan-200/12 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:bg-cyan-200/20 disabled:opacity-50 sm:inline-flex"
          >
            <FaUserPlus size={11} />
            {isCreatingInvite ? "Creating..." : "Invite"}
          </button>
        ) : null}
      </div>

      <div className="fixed right-3 top-3 z-[1000] flex gap-2 lg:right-4 lg:top-4">
        {office.role === "admin" ? (
          <button
            type="button"
            onClick={handleCreateInvitation}
            disabled={isCreatingInvite}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-100/20 bg-cyan-200/10 text-cyan-50 shadow-lg backdrop-blur-md transition hover:bg-cyan-200/18 disabled:opacity-50 sm:hidden"
            aria-label="Create member invitation"
          >
            <FaUserPlus size={15} />
          </button>
        ) : null}
        <Motion.button
          onClick={handleExit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Exit office"
          type="button"
        >
          <FaSignOutAlt size={16} />
        </Motion.button>
      </div>

      {invitationLink || inviteError ? (
        <div className="fixed right-4 top-20 z-[1080] w-[min(24rem,calc(100vw-2rem))] rounded-[24px] border border-cyan-100/15 bg-[#10182b]/96 p-4 text-white shadow-2xl backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/55">Member invitation</p>
              <p className="mt-2 text-sm text-white/70">
                {invitationLink ? "Share this single-use link with one teammate." : inviteError}
              </p>
            </div>
            <button type="button" onClick={() => { setInvitationLink(""); setInviteError(""); }} className="text-xs text-white/45 hover:text-white">
              Close
            </button>
          </div>
          {invitationLink ? (
            <>
              <div className="mt-4 flex gap-2">
                <input readOnly value={invitationLink} aria-label="Invitation link" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/75 outline-none" />
                <button type="button" onClick={() => copyInvitation()} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-medium hover:bg-white/16">
                  <FaCopy size={11} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/35">
                Expires {new Date(invitationExpiry).toLocaleString()}
              </p>
              {inviteError ? <p className="mt-2 text-xs text-amber-200">{inviteError}</p> : null}
            </>
          ) : null}
        </div>
      ) : null}

      <PhaserGame
        selfSocketId={roomPresence.selfSocketId}
        players={roomPresence.participants}
        onLocalPlayerMove={roomPresence.emitLocalPlayerMove}
        subscribeToRemoteMoves={roomPresence.subscribeToRemoteMoves}
        conversationPeerIds={(spatialConversation.peers as Player[]).map((peer) => peer.socketId)}
      />
      {socketStatus.isConnected && !roomPresence.accessError ? (
        <SpatialConversationDock identity={identity} {...spatialConversation} />
      ) : null}

      {!socketStatus.isConnected || roomPresence.accessError ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/12 bg-[#11162a]/95 p-6 text-white shadow-[0_40px_120px_-50px_rgba(0,0,0,0.92)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Office sync unavailable</p>
            <h2 className="mt-3 text-2xl font-semibold">
              {roomPresence.accessError ? "Office access denied" : socketStatus.hasConnectionError ? "Backend is unreachable" : "Connecting to your office"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {blockingError || "Hold on while we establish the live office connection."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleExit} className="btn-base btn-primary flex-1">Back to dashboard</button>
              {!roomPresence.accessError ? (
                <button type="button" onClick={() => window.location.reload()} className="btn-base btn-outline flex-1 !bg-white/8 !text-white hover:!bg-white/12">Retry connection</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Office = () => {
  const navigate = useNavigate();
  const { officeSlug = "" } = useParams();
  const [office, setOffice] = useState<OfficeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    getOffice(officeSlug, controller.signal)
      .then(setOffice)
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError, "This office could not be opened."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [officeSlug]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] text-sm text-white/60">Unlocking office...</div>;
  }

  if (!office || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-primary px-4 text-theme-primary">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.045] p-7 text-center">
          <p className="text-xs uppercase tracking-[0.26em] text-theme-secondary">Office unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold">You cannot open this office.</h1>
          <p className="mt-3 text-sm leading-6 text-theme-secondary">{error || "The office does not exist or you are not a member."}</p>
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-base btn-primary mt-6 w-full">Back to dashboard</button>
        </div>
      </div>
    );
  }

  return <OfficeWorld office={office} />;
};

export default Office;
