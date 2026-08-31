// Landing.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { FaUsers, FaSyncAlt, FaUserEdit, FaMobileAlt } from "react-icons/fa";
import AuroraBackground from "../components/AuroraBackground";
import AnimatedGrid from "../components/AnimatedGrid";
import GlassCard from "../components/GlassCard";

const features = [
  {
    icon: <FaUsers size={24} />, 
    title: "Social Interaction",
    desc: "Engage in seamless conversations with avatars in shared spaces."
  },
  {
    icon: <FaSyncAlt size={24} />, 
    title: "Real-Time Collaboration",
    desc: "Experience low-latency interactions ideal for work, study, or casual hangs."
  },
  {
    icon: <FaUserEdit size={24} />, 
    title: "Avatar Customisation",
    desc: "Design your own digital identity with customizable avatars."
  },
  {
    icon: <FaMobileAlt size={24} />, 
    title: "Low-End Device Friendly",
    desc: "Optimized performance for all devices, no high specs needed."
  },
];

interface Particle {
  top: string;
  left: string;
  delay: number;
  duration: number;
  size: number;
  color: string;
  yOffset: number;
}

function GlowingParticles({ count = 90, className = "" }: { count?: number; className?: string }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const accentColors = [
      'var(--accent-start)',
      'var(--accent-end)',
      '#6d72ff',
      '#b27bff'
    ];
    const temp = Array.from({ length: count }, () => {
      const size = 2 + Math.random() * 4; // 2px - 6px
      const color = accentColors[Math.floor(Math.random()*accentColors.length)];
      return {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 4,
        duration: 3.5 + Math.random() * 5,
        size,
        color,
        yOffset: 12 + Math.random() * 28
      };
    });
    setParticles(temp);
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <Motion.span
          key={i}
          className={`absolute rounded-full opacity-80 ${className}`}
          style={{ 
            top: p.top, 
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${6 + p.size * 1.8}px ${p.size * 0.4}px ${p.color}`,
            filter: 'blur(.3px)'
          }}
          initial={{ opacity: 0, y: p.yOffset * 0.4 }}
          animate={{ y: -p.yOffset, opacity: [0, 0.9, 0] }}
          transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}


const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden w-full bg-theme-primary text-theme-primary">
      {/* Ambient Layers */}
      <AuroraBackground />
      <AnimatedGrid />
      <GlowingParticles count={90} />

  {/* Hero Section */}
  <section className="relative pt-32 md:pt-40 pb-44 md:pb-56 content-wrapper">
        <div className="grid-overlay-hero"></div>
        <div className="max-w-3xl mx-auto text-center relative">
          <Motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6"
          >
            Metameet: Connect, Collaborate, Simply.<br className="hidden md:block" />
            <span className="text-accent-gradient">The 2D Metaverse for All.</span>
          </Motion.h1>
          <Motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: .15, ease: 'easeOut' }}
            className="text-lg md:text-xl text-theme-secondary max-w-2xl mx-auto mb-10"
          >
            Build meaningful interactions inside persistent virtual offices. Real-time movement, identity, and collaboration—accessible on any device.
          </Motion.p>
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .25, duration: .7 }}
            className="flex justify-center items-center"
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-base btn-cta ring-pulse shadow-lg"
            >
              Open dashboard
            </button>
          </Motion.div>
        </div>

      </section>

      {/* Features Section */}
  <section className="relative py-10 md:py-20 content-wrapper">
        <div className="mx-auto mb-12 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Capabilities</h2>

        </div>
        <div className="grid gap-8 md:gap-10 grid-cols-1 sm:grid-cols-2">
          {features.map((feature, idx) => (
            <GlassCard key={feature.title} delay={idx * 0.07} className="p-6 flex items-start gap-5">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-theme-surface/40 glow-border" style={{ color: 'var(--accent-start)' }}>
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-theme-secondary">{feature.desc}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="relative py-20 content-wrapper">
        <GlassCard className="p-10 md:p-14 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Build Your Office?</h3>
            <p className="text-theme-secondary max-w-2xl mx-auto mb-8">Create a persistent office, invite your teammates, and explore movement, presence, and ambient collaboration together.</p>
            <div className="flex justify-center">
              <button onClick={() => navigate('/dashboard')} className="btn-base btn-primary">Go to offices</button>
            </div>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-theme/60 py-8 mt-10 content-wrapper text-sm text-theme-secondary">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2 max-w-md">
            <span className="block font-semibold text-theme-primary">MetaMeet</span>
            <p className="text-xs leading-relaxed">A lightweight shared presence layer for the browser. Built for creative, social, and collaborative expression.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Made with</span>
            <span className="text-red-500">❤</span>
            <span>by</span>
            <a href="#" className="hover:opacity-80 transition" style={{ color: 'var(--accent-start)' }}>Team MetaMeet</a>
          </div>
          <div className="text-xs opacity-80">© 2025 MetaMeet. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
