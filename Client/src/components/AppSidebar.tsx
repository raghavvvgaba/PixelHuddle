import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronDown,
  FaHome,
  FaLayerGroup,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaUserPlus,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

interface AppSidebarProps {
  compact?: boolean;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GM";

const AppSidebar = ({ compact = false }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex min-h-11 items-center rounded-2xl border px-3 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-start)] ${
      compact ? "lg:justify-center lg:px-0" : "gap-3"
    } ${
      isActive
        ? "border-white/15 bg-white/10 text-theme-primary shadow-[0_12px_35px_-24px_rgba(123,97,255,0.9)]"
        : "border-transparent text-theme-secondary hover:border-white/10 hover:bg-white/6 hover:text-theme-primary"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        className="fixed left-3 top-3 z-[1500] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[#11162a]/90 text-white shadow-xl backdrop-blur-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
        aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? <FaTimes size={17} /> : <FaBars size={17} />}
      </button>

      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-[1350] bg-black/55 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-[1400] flex w-[268px] flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(17,22,42,0.97),rgba(10,10,26,0.96))] px-3 py-4 text-theme-primary shadow-[24px_0_80px_-55px_rgba(74,74,255,0.8)] backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
          compact ? "lg:w-20" : "lg:w-[268px]"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Primary navigation"
      >
        <div className={`flex h-14 items-center px-2 ${compact ? "lg:justify-center lg:px-0" : "gap-3"}`}>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,var(--accent-start),var(--accent-end))] text-sm font-black tracking-tight text-white shadow-[0_12px_30px_-12px_rgba(74,74,255,0.9)]">
            GM
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#11162a] bg-emerald-400" />
          </div>
          <div className={compact ? "lg:hidden" : ""}>
            <p className="text-base font-bold tracking-tight">GatherMeet</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-theme-secondary">Spatial campus</p>
          </div>
        </div>

        <div className={`mt-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent ${compact ? "lg:mx-1" : "mx-2"}`} />

        <nav className="mt-5 flex flex-col gap-2" aria-label="App pages">
          <NavLink to="/" end className={linkClass} title={compact ? "Home" : undefined}>
            <FaHome className="shrink-0" size={16} />
            <span className={compact ? "lg:sr-only" : ""}>Home</span>
          </NavLink>

          {isAuthenticated ? (
            <NavLink to="/dashboard" className={linkClass} title={compact ? "Dashboard" : undefined}>
              <FaLayerGroup className="shrink-0" size={16} />
              <span className={compact ? "lg:sr-only" : ""}>Dashboard</span>
            </NavLink>
          ) : null}
        </nav>

        <div className="mt-auto pt-4">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3" aria-label="Checking session">
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/10" />
              <div className={`min-w-0 flex-1 space-y-2 ${compact ? "lg:hidden" : ""}`}>
                <div className="h-2.5 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="h-2 w-28 animate-pulse rounded-full bg-white/6" />
              </div>
            </div>
          ) : isAuthenticated && user ? (
            <div ref={profileRef} className="relative">
              {isProfileOpen ? (
                <div
                  className={`absolute bottom-[calc(100%+12px)] overflow-hidden rounded-[22px] border border-white/12 bg-[#14192e]/98 p-2 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl ${
                    compact ? "left-0 right-0 lg:bottom-0 lg:left-full lg:right-auto lg:ml-3 lg:w-72" : "left-0 right-0"
                  }`}
                  role="menu"
                >
                  <div className="rounded-2xl bg-white/[0.045] px-3 py-3">
                    <p className="truncate text-sm font-semibold">{user.username}</p>
                    <p className="mt-0.5 truncate text-xs text-theme-secondary">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
                    role="menuitem"
                  >
                    <FaSignOutAlt size={15} />
                    Logout
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setIsProfileOpen((open) => !open)}
                className={`flex w-full items-center rounded-[20px] border border-white/10 bg-white/[0.045] p-2 text-left transition hover:border-white/20 hover:bg-white/[0.075] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-start)] ${
                  compact ? "lg:justify-center" : "gap-3"
                }`}
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(74,74,255,0.9),rgba(192,97,232,0.8))] text-xs font-bold text-white shadow-lg">
                  {getInitials(user.username)}
                </span>
                <span className={`min-w-0 flex-1 ${compact ? "lg:sr-only" : ""}`}>
                  <span className="block truncate text-sm font-semibold">{user.username}</span>
                  <span className="block truncate text-[11px] text-theme-secondary">View profile</span>
                </span>
                <FaChevronDown
                  size={11}
                  className={`shrink-0 text-theme-secondary transition-transform ${isProfileOpen ? "rotate-180" : ""} ${compact ? "lg:hidden" : ""}`}
                />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <NavLink
                to="/login"
                className="btn-base btn-primary flex w-full gap-2 !px-3"
              >
                <FaSignInAlt size={14} />
                Sign in
              </NavLink>
              <NavLink
                to="/signup"
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-medium text-theme-secondary transition hover:bg-white/6 hover:text-theme-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-start)]"
              >
                <FaUserPlus size={12} />
                Create account
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
