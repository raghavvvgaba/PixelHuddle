import React from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import AuroraBackground from "../components/AuroraBackground";
import AnimatedGrid from "../components/AnimatedGrid";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full bg-theme-primary flex items-center justify-center overflow-hidden px-4">
      <AuroraBackground />
      <AnimatedGrid />
      
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0.8, 0.3, 1] }}
        className="relative z-10 text-center"
      >
        <Motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-9xl md:text-[12rem] font-bold text-accent-gradient mb-4"
        >
          404
        </Motion.h1>
        
        <Motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-2xl md:text-3xl font-semibold text-theme-primary mb-4"
        >
          Page Not Found
        </Motion.h2>
        
        <Motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-theme-secondary mb-8 max-w-md mx-auto"
        >
          The page you're looking for doesn't exist or has been moved.
        </Motion.p>
        
        <Motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          onClick={() => navigate("/")}
          className="btn-base btn-primary btn-shine"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Go Home
        </Motion.button>
      </Motion.div>
    </div>
  );
};

export default NotFound;
