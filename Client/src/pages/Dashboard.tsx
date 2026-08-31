import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { FaArrowRight, FaBuilding, FaPlus, FaShieldAlt, FaUsers } from "react-icons/fa";
import AuroraBackground from "../components/AuroraBackground";
import AnimatedGrid from "../components/AnimatedGrid";
import {
  createOffice,
  getApiErrorMessage,
  listOffices,
  type Office,
} from "../api/offices";

const Dashboard = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeName, setOfficeName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    listOffices(controller.signal)
      .then(setOffices)
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(getApiErrorMessage(requestError, "We could not load your offices."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const handleCreateOffice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;

    setError("");
    setIsCreating(true);

    try {
      const office = await createOffice(officeName);
      setOffices((current) => [office, ...current]);
      setOfficeName("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not create that office."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-theme-primary text-theme-primary">
      <AuroraBackground />
      <AnimatedGrid />

      <main className="relative z-10 px-4 py-10 md:px-8 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <Motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end"
          >
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/65">
                Office directory
              </p>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Your persistent places to work together.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-theme-secondary">
                Offices stay on your dashboard, keep the same link, and only admit invited members.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.24em] text-theme-secondary">Joined offices</span>
                <span className="text-2xl font-semibold tabular-nums">{offices.length}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#22d3ee,#818cf8)]" />
              </div>
            </div>
          </Motion.header>

          {error ? (
            <div role="alert" className="mb-6 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
            <Motion.form
              onSubmit={handleCreateOffice}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
              className="glass-panel glow-border soft-shadow rounded-[28px] p-6 lg:sticky lg:top-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-100">
                <FaPlus />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-theme-secondary">New office</p>
              <h2 className="mt-2 text-2xl font-semibold">Create a home base</h2>
              <p className="mt-3 text-sm leading-6 text-theme-secondary">
                You become the admin. Invite teammates after entering the office.
              </p>

              <label htmlFor="office-name" className="mt-7 block text-sm font-medium">
                Office name
              </label>
              <input
                id="office-name"
                value={officeName}
                onChange={(event) => setOfficeName(event.target.value)}
                minLength={3}
                maxLength={80}
                required
                placeholder="Computer Science Lab"
                className="mt-2 w-full rounded-2xl border border-theme bg-black/10 px-4 py-3.5 placeholder:text-theme-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
              />
              <button
                type="submit"
                disabled={isCreating || officeName.trim().length < 3}
                className="btn-base btn-primary mt-5 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaPlus size={13} />
                {isCreating ? "Creating office..." : "Create office"}
              </button>
            </Motion.form>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-secondary">Your places</p>
                  <h2 className="mt-1 text-2xl font-semibold">Open an office</h2>
                </div>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1].map((item) => (
                    <div key={item} className="h-56 animate-pulse rounded-[26px] border border-white/8 bg-white/[0.035]" />
                  ))}
                </div>
              ) : offices.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.025] px-6 py-16 text-center">
                  <FaBuilding className="mx-auto text-3xl text-cyan-100/55" />
                  <h3 className="mt-5 text-xl font-semibold">No office keys yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-theme-secondary">
                    Create your first office here, or accept an invitation shared by another admin.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {offices.map((office, index) => (
                    <Motion.div
                      key={office.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    >
                      <Link
                        to={`/offices/${office.slug}`}
                        className="group block min-h-56 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-5 shadow-[0_28px_70px_-52px_rgba(34,211,238,0.85)] transition hover:-translate-y-1 hover:border-cyan-200/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,#67e8f9,rgba(79,70,229,0.72))] text-[#08111d] shadow-lg">
                            <FaBuilding />
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-secondary">
                            {office.role === "admin" ? <FaShieldAlt /> : <FaUsers />}
                            {office.role}
                          </span>
                        </div>
                        <h3 className="mt-8 text-2xl font-semibold tracking-tight">{office.name}</h3>
                        <p className="mt-2 truncate font-mono text-xs text-theme-secondary">/{office.slug}</p>
                        <div className="mt-7 flex items-center gap-2 text-sm font-medium text-cyan-100">
                          Enter office
                          <FaArrowRight className="transition-transform group-hover:translate-x-1" size={12} />
                        </div>
                      </Link>
                    </Motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
