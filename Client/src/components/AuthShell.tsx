import type { ReactNode } from 'react';
import AuroraBackground from './AuroraBackground';
import AnimatedGrid from './AnimatedGrid';

interface AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const AuthShell = ({ children, title, subtitle }: AuthShellProps) => {
  return (
    <div className="relative min-h-screen w-full bg-theme-primary flex items-center justify-center overflow-hidden px-4 py-10">
      <AuroraBackground />
      <AnimatedGrid />
      <div className="absolute inset-0 pointer-events-none">
        {/* optional extra ambience layer later */}
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel glow-border soft-shadow p-8 md:p-10">
          {title && (
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-accent-gradient">{title}</h1>
              {subtitle && <p className="text-theme-secondary text-sm md:text-base">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
