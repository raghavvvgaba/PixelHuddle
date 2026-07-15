import React from 'react';
import { motion as Motion } from 'framer-motion';

const blobs = [
  { className: '', style: { top: '-10%', left: '-5%' } },
  { className: 'alt', style: { bottom: '-15%', right: '-10%' } },
  { className: '', style: { top: '30%', right: '-5%' } },
];

const AuroraBackground = () => {
  return (
    <div className="aurora-layer" aria-hidden="true">
      {blobs.map((b, i) => (
        <Motion.div
          key={i}
            className={`aurora-blob ${b.className}`}
            style={b.style}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.25, duration: 1.2, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

export default AuroraBackground;
