import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion as Motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  FaUsers,
  FaBolt,
  FaLayerGroup,
  FaVideo,
  FaArrowRight,
  FaGithub,
  FaTwitter,
  FaDiscord,
} from "react-icons/fa";
import { HiArrowRight, HiSparkles } from "react-icons/hi2";

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const raw = useMotionValue(0);
  const smooth = useSpring(raw, { stiffness: 55, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => { if (inView) raw.set(target); }, [inView, raw, target]);
  useEffect(() => {
    const unsub = smooth.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [smooth]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

// ─── LANDING NAV ──────────────────────────────────────────────────────────────
function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <Motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(9,8,15,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,85,0,0.12)" : "1px solid transparent",
      }}
    >
      <div className="content-wrapper flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl font-display font-black text-sm text-white"
            style={{
              background: "var(--orange)",
              boxShadow: "3px 3px 0 0 var(--orange-dim)",
              transition: "transform .14s, box-shadow .14s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "4px 4px 0 0 var(--orange-dim)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--orange-dim)";
            }}
          >
            GM
          </div>
          <span className="font-display font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
            GatherMeet
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {["Features", "About"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="hidden md:block text-sm font-semibold transition-all px-3 py-2 rounded-lg"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="neo-btn neo-btn-primary px-5 py-2.5 text-sm"
          >
            Get started <HiArrowRight className="ml-1.5 inline" size={14} />
          </button>
        </div>
      </div>
    </Motion.nav>
  );
}

// ─── FLOATING PARTICLES (orange-toned) ───────────────────────────────────────
interface Particle {
  top: string; left: string; delay: number;
  duration: number; size: number; color: string; yOffset: number;
}

function FloatingParticles({ count = 40 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const palette = ["var(--orange)", "var(--orange-bright)", "var(--lime)", "var(--pink)", "var(--cyan)"];
    setParticles(
      Array.from({ length: count }, () => {
        const size = 1.5 + Math.random() * 2.5;
        return {
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          delay: Math.random() * 5,
          duration: 4 + Math.random() * 6,
          size,
          color: palette[Math.floor(Math.random() * palette.length)],
          yOffset: 15 + Math.random() * 30,
        };
      })
    );
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <Motion.span
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: p.top, left: p.left,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${8 + p.size * 2}px ${p.color}`,
          }}
          animate={{ y: -p.yOffset, opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Background layers */}
      <div className="absolute inset-0" style={{ background: "var(--bg-primary)" }} />
      <div className="dot-grid" aria-hidden="true" />
      <div className="scanline-overlay" aria-hidden="true" />
      <FloatingParticles count={40} />

      {/* Orange glow blobs */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          width: 700, height: 700,
          top: "-20%", left: "-15%",
          background: "radial-gradient(circle, rgba(255,85,0,0.12) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          width: 500, height: 500,
          bottom: "-10%", right: "-10%",
          background: "radial-gradient(circle, rgba(255,0,119,0.1) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 content-wrapper text-center">
        {/* Beta badge */}
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center mb-8"
        >
          <span className="badge-pill orange">
            <HiSparkles size={9} />
            Now in public beta
          </span>
        </Motion.div>

        {/* Headline — massive, takes up the page */}
        <Motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="font-display font-extrabold tracking-tight"
            style={{
              fontSize: "clamp(3.5rem, 10vw, 8.5rem)",
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
            }}
          >
            Your world.
            <br />
            <span
              className="text-glow-orange"
              style={{ color: "var(--orange)" }}
            >
              Your rules.
            </span>
          </h1>
        </Motion.div>

        {/* Sub */}
        <Motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mt-8 mb-12 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          A 2D virtual campus where{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>proximity starts conversations</span>,
          avatars roam free, and video just{" "}
          <span style={{ color: "var(--orange)", fontWeight: 600 }}>happens</span>.
          No meeting links. No friction.
        </Motion.p>

        {/* CTAs */}
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.55 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={() => navigate("/signup")}
            className="neo-btn neo-btn-primary px-10 py-4 text-base"
            style={{ fontSize: "1.05rem" }}
          >
            Enter the world
            <FaArrowRight size={14} className="ml-2 inline" />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="neo-btn neo-btn-outline px-8 py-4 text-base"
            style={{ fontSize: "1.05rem" }}
          >
            I already have an office
          </button>
        </Motion.div>

        {/* Micro-copy */}
        <Motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.55 }}
          className="mt-8 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Free to use · No credit card · Open source
        </Motion.p>
      </div>

      {/* Scroll fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, var(--bg-primary))` }}
      />
    </section>
  );
}

// ─── MARQUEE STRIP ────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "⚡ Proximity Video", "🎮 Game-Like World", "🏢 Persistent Offices",
  "🔴 Live Presence", "🖥 Screen Sharing", "👾 Custom Avatars",
  "⚡ Proximity Video", "🎮 Game-Like World", "🏢 Persistent Offices",
  "🔴 Live Presence", "🖥 Screen Sharing", "👾 Custom Avatars",
];

function MarqueeStrip() {
  return (
    <div
      className="relative py-4 overflow-hidden"
      style={{
        background: "var(--orange)",
        borderTop: "2px solid var(--orange-dim)",
        borderBottom: "2px solid var(--orange-dim)",
      }}
    >
      <div className="marquee-track">
        {MARQUEE_ITEMS.map((item, i) => (
          <span
            key={i}
            className="shrink-0 px-6 font-display font-bold text-white uppercase tracking-widest text-sm"
            style={{ whiteSpace: "nowrap" }}
          >
            {item}
            <span className="mx-4 opacity-50">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── FEATURE SECTION ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    num: "01",
    icon: <FaUsers size={22} />,
    title: "Proximity Conversations",
    desc: "Walk close to someone in the 2D world and video/audio connects automatically. Step away and it drops. Zero friction — like a real office hallway.",
    accent: "orange" as const,
    accentColor: "var(--orange)",
  },
  {
    num: "02",
    icon: <FaBolt size={22} />,
    title: "Live Presence",
    desc: "See exactly who's in the building, where they're standing, and whether they're in a conversation — all updated in real-time.",
    accent: "lime" as const,
    accentColor: "var(--lime)",
  },
  {
    num: "03",
    icon: <FaVideo size={22} />,
    title: "WebRTC Video & Screen Share",
    desc: "Peer-to-peer video, audio, and screen sharing built in. No Zoom, no Google Meet. Just click and move.",
    accent: "pink" as const,
    accentColor: "var(--pink)",
  },
  {
    num: "04",
    icon: <FaLayerGroup size={22} />,
    title: "Persistent Offices",
    desc: "Your virtual office stays open. Create it once, share a link, and teammates can drop in any time they're online.",
    accent: "cyan" as const,
    accentColor: "var(--cyan)",
  },
];

function FeatureSection() {
  return (
    <section id="features" className="relative py-28" style={{ background: "var(--bg-primary)" }}>
      <div className="content-wrapper">
        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <span className="badge-pill orange mb-5">
            <FaBolt size={8} />
            What you get
          </span>
          <h2
            className="font-display font-extrabold tracking-tight"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.75rem)",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              lineHeight: 1.05,
            }}
          >
            Everything you need.<br />
            <span style={{ color: "var(--orange)" }}>Nothing you don't.</span>
          </h2>
        </Motion.div>

        {/* Feature list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <Motion.div
              key={f.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
            >
              <div className={`neo-card ${f.accent} p-7 h-full`}>
                {/* Number + icon row */}
                <div className="flex items-center gap-4 mb-5">
                  <span
                    className="font-display font-black text-4xl leading-none"
                    style={{ color: f.accentColor, opacity: 0.25 }}
                  >
                    {f.num}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.accentColor}18`, color: f.accentColor }}
                  >
                    {f.icon}
                  </div>
                </div>
                <h3
                  className="font-display font-bold text-xl mb-3 tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {f.desc}
                </p>
              </div>
            </Motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── STATS SECTION ────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: 1200, suffix: "+", label: "Offices created" },
    { value: 8400, suffix: "+", label: "Hours collaborated" },
    { value: 3200, suffix: "+", label: "Users worldwide" },
  ];

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        borderTop: "2px solid var(--border-bright)",
        borderBottom: "2px solid var(--border-bright)",
      }}
    >
      <div className="grid-overlay" aria-hidden="true" />
      <div className="content-wrapper relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 md:divide-x"
          style={{ borderColor: "var(--border-bright)" }}>
          {stats.map((stat, i) => (
            <Motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center md:px-10"
            >
              <div
                className="font-display font-extrabold mb-2 text-glow-orange"
                style={{
                  fontSize: "clamp(3rem, 7vw, 5rem)",
                  letterSpacing: "-0.04em",
                  color: "var(--orange)",
                }}
              >
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <p
                className="text-sm uppercase tracking-widest font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                {stat.label}
              </p>
            </Motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section
      className="relative py-32 overflow-hidden"
      style={{ background: "var(--orange)" }}
    >
      {/* Decorative noise/grid on orange */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)",
        }}
      />

      <div className="relative z-10 content-wrapper text-center">
        <Motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="font-display font-extrabold tracking-tight text-white mb-6"
            style={{
              fontSize: "clamp(2.5rem, 7vw, 6rem)",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              textShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            Ready to build
            <br />
            your office?
          </h2>

          <p
            className="text-lg max-w-xl mx-auto mb-12"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            Create a space, invite your team, start moving together. Takes 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/signup")}
              className="neo-btn neo-btn-lime px-10 py-4 text-base"
              style={{ fontSize: "1rem" }}
            >
              🕹 Press Start
            </button>
            <button
              onClick={() => navigate("/login")}
              className="neo-btn px-8 py-4 text-base border-2 text-white"
              style={{
                fontSize: "1rem",
                borderColor: "rgba(255,255,255,0.4)",
                background: "transparent",
                boxShadow: "4px 4px 0 0 rgba(255,255,255,0.3)",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                borderRadius: 12,
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "6px 6px 0 0 rgba(255,255,255,0.4)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "4px 4px 0 0 rgba(255,255,255,0.3)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)";
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLElement).style.transform = "translate(2px,2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 transparent";
              }}
            >
              I already have one
            </button>
          </div>
        </Motion.div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer
      className="py-12"
      style={{
        background: "var(--bg-surface)",
        borderTop: "2px solid var(--border-bright)",
      }}
    >
      <div className="content-wrapper">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl font-display font-black text-xs text-white"
              style={{ background: "var(--orange)", boxShadow: "3px 3px 0 0 var(--orange-dim)" }}
            >
              GM
            </div>
            <div>
              <p className="font-display font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                GatherMeet
              </p>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                Spatial Campus
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            <a href="#features" className="transition-colors hover:text-[var(--orange)]">Features</a>
            <Link to="/signup" className="transition-colors hover:text-[var(--orange)]">Sign up</Link>
            <Link to="/login" className="transition-colors hover:text-[var(--orange)]">Login</Link>
          </div>

          {/* Social */}
          <div className="flex items-center gap-3">
            {[
              { icon: <FaGithub size={16} />, label: "GitHub" },
              { icon: <FaTwitter size={16} />, label: "Twitter" },
              { icon: <FaDiscord size={16} />, label: "Discord" },
            ].map(({ icon, label }) => (
              <button
                key={label}
                aria-label={label}
                className="icon-btn"
                style={{ color: "var(--text-secondary)" }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span>© 2025 GatherMeet. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Built with <span style={{ color: "var(--orange)" }}>♥</span> for students & builders
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const Landing = () => {
  return (
    <div
      className="relative w-full overflow-x-hidden"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <LandingNav />
      <HeroSection />
      <MarqueeStrip />
      <FeatureSection />
      <StatsSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Landing;
