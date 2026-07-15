import React from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <div className="glass-panel glow-border soft-shadow w-full max-w-6xl flex items-center justify-between px-6 py-4 rounded-2xl overflow-visible">
        <button
          onClick={() => navigate("/")}
          className="text-2xl font-bold text-accent-gradient focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-start)] rounded-md cursor-pointer"
          aria-label="Go to landing page"
        >
          MetaMeet
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-base btn-primary btn-shine"
          >
            Open Demo
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
