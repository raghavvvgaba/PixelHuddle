import { motion as Motion } from "framer-motion";
import { FaUsers, FaEllipsisV } from "react-icons/fa";

interface Space {
  name: string;
  description?: string;
  participants: number;
  lastVisited: string;
  isOwner?: boolean;
}

const SpaceCard = ({ space, delay = 0 }: { space: Space; delay?: number }) => {
  const handleSpaceClick = () => {
    // Navigate to the space - for now just log
    console.log(`Entering space: ${space.name}`);
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="glass-panel glow-border soft-shadow rounded-2xl overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-300"
      onClick={handleSpaceClick}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-accent-start/20 to-accent-end/20 overflow-hidden">
        {/* Placeholder for actual thumbnail - using gradient for now */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30"></div>
        
        {/* Floating elements to simulate the screenshot's room preview */}
        <div className="absolute inset-4">
          <div className="w-full h-full relative">
            {/* Simulated room elements */}
            <div className="absolute top-4 left-4 w-16 h-12 bg-green-400/60 rounded"></div>
            <div className="absolute top-4 right-4 w-12 h-12 bg-blue-400/60 rounded"></div>
            <div className="absolute bottom-4 left-4 w-20 h-8 bg-yellow-400/60 rounded"></div>
            <div className="absolute bottom-4 right-8 w-8 h-8 bg-red-400/60 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/40 rounded-lg"></div>
          </div>
        </div>

        {/* Participants count */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
          <FaUsers size={12} className="text-white" />
          <span className="text-xs text-white font-medium">{space.participants}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-theme-primary group-hover:text-accent-gradient transition-colors">
              {space.name}
            </h3>
            {space.description && (
              <p className="text-sm text-theme-secondary mt-1 line-clamp-2">
                {space.description}
              </p>
            )}
          </div>
          
          <button className="p-2 hover:bg-theme-surface/60 rounded-lg transition-colors">
            <FaEllipsisV size={12} className="text-theme-secondary" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-secondary">{space.lastVisited}</span>
          {space.isOwner && (
            <span className="text-accent-gradient font-medium">Owner</span>
          )}
        </div>
      </div>
    </Motion.div>
  );
};

export default SpaceCard;
