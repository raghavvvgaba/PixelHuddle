import React from 'react';
import { motion as Motion } from 'framer-motion';

const GlassCard = ({ children, className = '', delay = 0 }) => {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      whileHover={{
        y: -2,
        scale: 1.005,
        transition: { duration: 0.18, ease: [0.4, 0.8, 0.3, 1] }
      }}
      whileTap={{ scale: 0.993, transition: { duration: 0.14, ease: [0.4, 0.8, 0.3, 1] } }}
      className={`glass-panel glow-border soft-shadow relative group ${className}`}
    >
      <div className="relative z-10">
        {children}
      </div>
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-200"
        style={{
          background: 'radial-gradient(circle at 55% 40%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(circle at 30% 35%, var(--accent-end)6%, transparent 50%)',
          mixBlendMode: 'soft-light',
          transition: 'opacity .2s ease'
        }}
      />
    </Motion.div>
  );
};

export default GlassCard;
