import { useAnimations } from "./AnimationProvider";
import { AnimatePresence, motion } from "framer-motion";

export const AnimatedPanel = ({ children, isVisible, title, className = "" }) => {
  const { getAnimationDuration, animationSettings } = useAnimations();

  const panelVariants = {
    hidden: { 
      opacity: 0, 
      x: -20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: {
        duration: animationSettings.panelAnimations ? getAnimationDuration('panel') / 1000 : 0,
        ease: "easeOut"
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`bg-white rounded-lg shadow-lg border ${className}`}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {title && (
            <motion.div 
              className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-semibold text-gray-800">{title}</h3>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};