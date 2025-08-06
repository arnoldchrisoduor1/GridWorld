import { useAnimations } from "./AnimationProvider";

export const AnimatedAgent = ({ position, isTraining, recentReward, trail = [] }) => {
  const { getAnimationDuration, animationSettings } = useAnimations();

  const agentVariants = {
    idle: { 
      scale: 1,
      rotate: 0,
      transition: { duration: 0.3 }
    },
    training: {
      scale: [1, 1.1, 1],
      rotate: [0, 5, -5, 0],
      transition: { 
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    success: {
      scale: [1, 1.3, 1],
      rotate: [0, 360],
      transition: { duration: 0.6 }
    },
    failure: {
      scale: [1, 0.8, 1],
      x: [0, -2, 2, 0],
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      animate={{
        x: position[1] * 48, // 48px is cell width
        y: position[0] * 48,
      }}
      transition={{
        duration: animationSettings.agentAnimations ? getAnimationDuration('agent') / 1000 : 0,
        ease: "easeInOut"
      }}
    >
      {/* Agent trail effect */}
      <AnimatePresence>
        {trail.map((pos, index) => (
          <motion.div
            key={`${pos[0]}-${pos[1]}-${index}`}
            className="absolute w-2 h-2 bg-blue-400 rounded-full"
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              x: (pos[1] - position[1]) * 48,
              y: (pos[0] - position[0]) * 48,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main agent */}
      <motion.div
        className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg"
        variants={agentVariants}
        animate={isTraining ? 'training' : 'idle'}
      >
        <User size={16} />
      </motion.div>

      {/* Reward popup */}
      <AnimatePresence>
        {recentReward !== null && (
          <motion.div
            className={`absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs font-bold ${
              recentReward > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            {recentReward > 0 ? '+' : ''}{recentReward}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
