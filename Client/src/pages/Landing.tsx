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
  FaGamepad,
  FaBuilding,
  FaDesktop,
  FaMicrophone,
  FaUserAstronaut,
  FaCircle,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

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

// ─── PROXIMITY DEMO ───────────────────────────────────────────────────────────
interface AvatarUser {
  id: number;
  name: string;
  color: string;
  shadowColor: string;
  filter: string;
  // position as % of the section
  posX: string;
  posY: string;
  cardDir: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  activity: string;
}

const DEMO_USERS: AvatarUser[] = [
  { id: 1, name: "Priya",  color: "#FF5500", shadowColor: "rgba(255,85,0,0.6)",    filter: "hue-rotate(0deg)   saturate(1.4) brightness(1.1)",  posX: "10%", posY: "28%", cardDir: "bottom-right", activity: "Working on design" },
  { id: 2, name: "Marcus", color: "#00C8B4", shadowColor: "rgba(0,200,180,0.6)",  filter: "hue-rotate(160deg) saturate(1.6) brightness(1.05)", posX: "84%", posY: "22%", cardDir: "bottom-left",  activity: "In standup notes" },
  { id: 3, name: "Zoe",    color: "#AA00FF", shadowColor: "rgba(170,0,255,0.6)",  filter: "hue-rotate(260deg) saturate(1.5) brightness(1.1)",  posX: "8%",  posY: "70%", cardDir: "top-right",    activity: "Listening to music" },
  { id: 4, name: "Dev",    color: "#FFB800", shadowColor: "rgba(255,184,0,0.6)", filter: "hue-rotate(40deg)  saturate(1.5) brightness(1.15)", posX: "86%", posY: "66%", cardDir: "top-left",     activity: "Reviewing PRs" },
];

// Strip "%" and parse to number for distance math
const pct = (s: string) => parseFloat(s);

/** Static pixel-art character sprite (demo avatars) */
function PixelCharacter({ user, connected }: { user: AvatarUser; connected: boolean }) {
  return (
    <Motion.div
      className="relative"
      animate={{ scale: connected ? 1.18 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{ display: "inline-block" }}
    >
      <img
        src="/character/character_malePerson_walk0.png"
        alt={user.name}
        draggable={false}
        style={{
          width: 48, height: 64,
          imageRendering: "pixelated",
          filter: connected
            ? `${user.filter} drop-shadow(0 0 10px ${user.color})`
            : user.filter,
          display: "block",
          transition: "filter 0.2s ease",
        }}
      />
      {/* Online dot */}
      <span
        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
        style={{ background: "#22c55e", borderColor: "var(--bg-primary)", boxShadow: "0 0 6px rgba(34,197,94,0.9)" }}
      />
      {/* Floor glow on connect */}
      {connected && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{ bottom: -6, width: 44, height: 8, background: user.color, filter: "blur(7px)", opacity: 0.65 }}
        />
      )}
    </Motion.div>
  );
}

/** The player-controlled avatar (arrow keys / WASD) */
function PlayerAvatar({ pos, isMoving }: { pos: { x: number; y: number }; isMoving: boolean }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isMoving) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => setFrame((f) => (f + 1) % 8), 100);
    return () => clearInterval(id);
  }, [isMoving]);

  return (
    <div
      className="absolute"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 25,
        pointerEvents: "none",
      }}
    >
      {/* "YOU" badge above */}
      <div
        className="absolute left-1/2 -translate-x-1/2 font-display font-black uppercase tracking-widest whitespace-nowrap px-2 py-0.5 rounded-md"
        style={{
          bottom: "calc(100% + 6px)",
          background: "var(--orange)",
          color: "#fff",
          fontSize: "0.55rem",
          boxShadow: "2px 2px 0 0 rgba(180,50,0,0.6)",
        }}
      >
        YOU
      </div>

      {/* Player sprite — cycles walk frames while moving */}
      <img
        src={`/character/character_malePerson_walk${frame}.png`}
        alt="Your avatar"
        draggable={false}
        style={{
          width: 52,
          height: 68,
          imageRendering: "pixelated",
          filter: "brightness(1.7) saturate(0.3) drop-shadow(0 0 6px rgba(255,255,255,0.5))",
          display: "block",
        }}
      />

      {/* Floor glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ bottom: -6, width: 44, height: 8, background: "var(--orange)", filter: "blur(6px)", opacity: 0.5 }}
      />
    </div>
  );
}

/** Waveform bars in the call card */
function Waveform({ color }: { color: string }) {
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9, 0.4, 0.75, 0.55];
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 20 }}>
      {bars.map((h, i) => (
        <Motion.div
          key={i}
          style={{ width: 3, borderRadius: 2, backgroundColor: color, originY: 1, height: 20 }}
          animate={{ scaleY: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3] }}
          transition={{ repeat: Infinity, duration: 0.9 + i * 0.07, delay: i * 0.06, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** A single demo avatar — purely presentational, connected driven by player position */
function ProximityAvatar({ user, connected }: { user: AvatarUser; connected: boolean }) {
  const cardStyle: React.CSSProperties = { position: "absolute", zIndex: 30 };
  if (user.cardDir === "bottom-right") { cardStyle.top = "calc(100% + 14px)"; cardStyle.left = 0; }
  if (user.cardDir === "bottom-left")  { cardStyle.top = "calc(100% + 14px)"; cardStyle.right = 0; }
  if (user.cardDir === "top-right")    { cardStyle.bottom = "calc(100% + 14px)"; cardStyle.left = 0; }
  if (user.cardDir === "top-left")     { cardStyle.bottom = "calc(100% + 14px)"; cardStyle.right = 0; }

  return (
    <div
      className="absolute"
      style={{ left: user.posX, top: user.posY, transform: "translate(-50%, -50%)" }}
    >
      {/* Idle pulse ring */}
      <Motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ width: 60, height: 60, border: `2px solid ${user.color}` }}
        animate={{ scale: [1, 1.9, 1], opacity: [0.35, 0, 0.35] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />

      {/* Sprite */}
      <PixelCharacter user={user} connected={connected} />

      {/* Name tag */}
      <div
        className="absolute left-1/2 font-display font-bold whitespace-nowrap px-2 py-0.5 rounded-md"
        style={{
          top: "calc(100% + 10px)", transform: "translateX(-50%)",
          background: "var(--bg-surface)", border: `1px solid ${user.color}60`,
          color: "var(--text-primary)", fontSize: "0.62rem",
        }}
      >
        {user.name}
      </div>

      {/* Call card */}
      <Motion.div
        style={cardStyle}
        initial={false}
        animate={{
          opacity: connected ? 1 : 0,
          scale: connected ? 1 : 0.88,
          y: connected ? 0 : (user.cardDir.startsWith("top") ? 8 : -8),
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="pointer-events-none"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            width: 200,
            background: "var(--bg-surface)",
            border: `2px solid ${user.color}`,
            boxShadow: `4px 4px 0 0 ${user.color}80`,
          }}
        >
          {/* Camera feed */}
          <div
            className="relative w-full flex items-center justify-center"
            style={{ height: 100, background: `linear-gradient(135deg, ${user.color}18, ${user.color}06)` }}
          >
            <img
              src="/character/character_malePerson_walk0.png"
              alt={user.name}
              style={{ height: 72, imageRendering: "pixelated", filter: user.filter, opacity: 0.85 }}
            />
            <div
              className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.5)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
              <span style={{ fontSize: "0.6rem", color: "#22c55e", fontWeight: 700 }}>Connected</span>
            </div>
            <div
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            ><FaMicrophone size={8} style={{ color: "rgba(255,255,255,0.6)" }} /></div>
          </div>
          {/* Footer */}
          <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${user.color}25` }}>
            <div>
              <p className="font-display font-bold text-xs" style={{ color: "var(--text-primary)" }}>{user.name}</p>
              <p style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>{user.activity}</p>
            </div>
            <Waveform color={user.color} />
          </div>
        </div>
      </Motion.div>
    </div>
  );
}

/** Keyboard hint — fades out when user starts moving, or after 8s */
function ProximityHint({ hasMoved }: { hasMoved: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (hasMoved) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, [hasMoved]);

  return (
    <Motion.div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-5 py-2.5 rounded-2xl pointer-events-none"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-bright)",
        whiteSpace: "nowrap",
      }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
      transition={{ duration: 0.45 }}
    >
      {/* Key icons */}
      {["↑", "↓", "←", "→"].map((k) => (
        <span
          key={k}
          className="font-display font-bold text-xs px-1.5 py-0.5 rounded"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-bright)",
            color: "var(--text-primary)",
            fontSize: "0.7rem",
            boxShadow: "0 2px 0 0 rgba(255,255,255,0.06)",
          }}
        >
          {k}
        </span>
      ))}
      <span style={{ color: "var(--text-secondary)", fontSize: "0.72rem" }}>
        Walk near someone to connect
      </span>
    </Motion.div>
  );
}

/** Master demo component — owns the game loop and all state */
function ProximityDemo() {
  // Player position in % coordinates (0–100)
  const playerPosRef = useRef({ x: 50, y: 72 });
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 72 });

  // Per-avatar connected state
  const [connected, setConnected] = useState<boolean[]>(DEMO_USERS.map(() => false));
  const prevConnected = useRef<boolean[]>(DEMO_USERS.map(() => false));

  // Movement state for walk animation
  const [isMoving, setIsMoving] = useState(false);
  const prevMoving = useRef(false);

  const keysRef = useRef(new Set<string>());
  const heroInViewRef = useRef(false);
  const [hasMoved, setHasMoved] = useState(false);
  const hasMoved_ref = useRef(false);

  useEffect(() => {
    const heroEl = document.getElementById("hero-section");

    // Only preventDefault on arrow keys when hero is in view
    const observer = new IntersectionObserver(
      ([entry]) => { heroInViewRef.current = entry.isIntersecting; },
      { threshold: 0.4 }
    );
    if (heroEl) observer.observe(heroEl);

    const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"]);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.has(e.key)) return;
      keysRef.current.add(e.key);
      if (heroInViewRef.current) e.preventDefault();
      if (!hasMoved_ref.current) {
        hasMoved_ref.current = true;
        setHasMoved(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ── Game loop ─────────────────────────────────────────────────────────────
    const SPEED = 0.28;   // % per frame
    const THRESHOLD = 8;  // % distance to trigger connect (tighter = must walk up close)

    let rafId: number;
    const loop = () => {
      const keys = keysRef.current;
      let { x, y } = playerPosRef.current;

      if (keys.has("ArrowUp")    || keys.has("w")) y = Math.max(8,  y - SPEED);
      if (keys.has("ArrowDown")  || keys.has("s")) y = Math.min(88, y + SPEED);
      if (keys.has("ArrowLeft")  || keys.has("a")) x = Math.max(4,  x - SPEED);
      if (keys.has("ArrowRight") || keys.has("d")) x = Math.min(94, x + SPEED);

      // Update position only when it changed
      if (x !== playerPosRef.current.x || y !== playerPosRef.current.y) {
        playerPosRef.current = { x, y };
        setPlayerPos({ x, y });
      }

      // Track moving state for walk animation
      const moving = keys.size > 0;
      if (moving !== prevMoving.current) {
        prevMoving.current = moving;
        setIsMoving(moving);
      }

      // Proximity check — % space distance
      const newConnected = DEMO_USERS.map((u) => {
        const dist = Math.sqrt((x - pct(u.posX)) ** 2 + (y - pct(u.posY)) ** 2);
        return dist < THRESHOLD;
      });

      const changed = newConnected.some((c, i) => c !== prevConnected.current[i]);
      if (changed) {
        prevConnected.current = newConnected;
        setConnected(newConnected);
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true">
      {/* Demo avatars */}
      {DEMO_USERS.map((u, i) => (
        <ProximityAvatar key={u.id} user={u} connected={connected[i]} />
      ))}

      {/* Player avatar */}
      <PlayerAvatar pos={playerPos} isMoving={isMoving} />

      {/* Keyboard hint */}
      <ProximityHint hasMoved={hasMoved} />
    </div>
  );
}


// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section id="hero-section" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Background layers */}
      <div className="absolute inset-0" style={{ background: "var(--bg-primary)" }} />
      <div className="dot-grid" aria-hidden="true" />
      <div className="scanline-overlay" aria-hidden="true" />
      <FloatingParticles count={40} />

      {/* Orange glow blobs */}
      <div className="absolute pointer-events-none" aria-hidden="true"
        style={{ width: 700, height: 700, top: "-20%", left: "-15%", background: "radial-gradient(circle, rgba(255,85,0,0.12) 0%, transparent 65%)", filter: "blur(60px)" }}
      />
      <div className="absolute pointer-events-none" aria-hidden="true"
        style={{ width: 500, height: 500, bottom: "-10%", right: "-10%", background: "radial-gradient(circle, rgba(255,0,119,0.1) 0%, transparent 65%)", filter: "blur(60px)" }}
      />

      <div className="relative z-10 content-wrapper text-center">
        {/* Beta badge */}
        <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex justify-center mb-8">
          <span className="badge-pill orange">
            <HiSparkles size={9} />
            Now in public beta
          </span>
        </Motion.div>

        {/* Headline */}
        <Motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
          <h1
            className="font-display font-extrabold tracking-tight"
            style={{ fontSize: "clamp(3.5rem, 10vw, 8.5rem)", lineHeight: 0.92, letterSpacing: "-0.04em", color: "var(--text-primary)" }}
          >
            Your world.
            <br />
            <span className="text-glow-orange" style={{ color: "var(--orange)" }}>Your rules.</span>
          </h1>
        </Motion.div>

        {/* Sub */}
        <Motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}
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
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.55 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button onClick={() => navigate("/signup")} className="neo-btn neo-btn-primary px-10 py-4 text-base" style={{ fontSize: "1.05rem" }}>
            Create your office <FaArrowRight size={14} className="ml-2 inline" />
          </button>
        </Motion.div>

        {/* Micro-copy */}
        <Motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.55 }} className="mt-8 text-sm" style={{ color: "var(--text-secondary)" }}>
          Free to use · No credit card · Open source
        </Motion.p>
      </div>

      {/* Proximity avatar demo */}
      <ProximityDemo />

      {/* Scroll fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent, var(--bg-primary))` }} />
    </section>
  );
}




// ─── MARQUEE STRIP ────────────────────────────────────────────────────────────
interface MarqueeItem { label: string; icon: React.ReactNode }

const MARQUEE_ITEMS: MarqueeItem[] = [
  { icon: <FaBolt size={13} />,         label: "Proximity Video" },
  { icon: <FaGamepad size={13} />,      label: "Game-Like World" },
  { icon: <FaBuilding size={13} />,     label: "Persistent Offices" },
  { icon: <FaCircle size={8} style={{ color: "#ff4444" }} />, label: "Live Presence" },
  { icon: <FaDesktop size={13} />,      label: "Screen Sharing" },
  { icon: <FaUserAstronaut size={13} />,label: "Custom Avatars" },
  // duplicate set for seamless loop
  { icon: <FaBolt size={13} />,         label: "Proximity Video" },
  { icon: <FaGamepad size={13} />,      label: "Game-Like World" },
  { icon: <FaBuilding size={13} />,     label: "Persistent Offices" },
  { icon: <FaCircle size={8} style={{ color: "#ff4444" }} />, label: "Live Presence" },
  { icon: <FaDesktop size={13} />,      label: "Screen Sharing" },
  { icon: <FaUserAstronaut size={13} />,label: "Custom Avatars" },
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
            className="shrink-0 px-6 font-display font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2"
            style={{ whiteSpace: "nowrap" }}
          >
            {item.icon}
            {item.label}
            <span className="mx-3 opacity-40">•</span>
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

          <div className="flex justify-center">
            <button
              onClick={() => navigate("/signup")}
              className="neo-btn neo-btn-lime px-10 py-4 text-base"
              style={{ fontSize: "1rem" }}
            >
              🕹 Press Start
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
