import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { FaArrowRight, FaEnvelopeOpenText, FaShieldAlt } from "react-icons/fa";
import AuroraBackground from "../components/AuroraBackground";
import AnimatedGrid from "../components/AnimatedGrid";
import { acceptInvitation, getApiErrorMessage } from "../api/offices";

const Invitation = () => {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!token || isAccepting) return;
    setError("");
    setIsAccepting(true);

    try {
      const office = await acceptInvitation(token);
      navigate(`/offices/${office.slug}`, { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "This invitation is invalid or no longer available."));
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-theme-primary px-4 py-12 text-theme-primary">
      <AuroraBackground />
      <AnimatedGrid />
      <Motion.main
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(145deg,rgba(22,28,49,0.94),rgba(10,10,26,0.92))] p-7 shadow-[0_45px_120px_-55px_rgba(34,211,238,0.65)] backdrop-blur-2xl md:p-10"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-200/20 bg-cyan-300/10 text-2xl text-cyan-100">
          <FaEnvelopeOpenText />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/60">Member invitation</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">You have an office key.</h1>
        <p className="mt-4 text-base leading-7 text-theme-secondary">
          Accepting adds this office to your dashboard and gives you member access to its shared world.
        </p>

        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
          <FaShieldAlt className="mt-0.5 shrink-0 text-cyan-100/70" />
          <p className="text-sm leading-6 text-theme-secondary">
            Invitation links are single-use and expire after seven days.
          </p>
        </div>

        {error ? (
          <p role="alert" className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!token || isAccepting}
            className="btn-base btn-primary flex-1 gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAccepting ? "Accepting..." : "Accept invitation"}
            {!isAccepting ? <FaArrowRight size={12} /> : null}
          </button>
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-base btn-outline flex-1">
            Back to dashboard
          </button>
        </div>
      </Motion.main>
    </div>
  );
};

export default Invitation;
