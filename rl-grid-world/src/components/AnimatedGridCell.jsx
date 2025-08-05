// AnimatedGridCell.jsx - Enhanced GridCell with animations
import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimations } from './AnimationProvider.jsx';
import { CELL_TYPES } from '../utils/constants.js';

export const AnimatedGridCell = memo(({ cellInfo, onClick, onHover, isHighlighted }) => {
  const { getAnimationDuration, animationSettings } = useAnimations();
  const [qValueChanged, setQValueChanged] = useState(false);

  // Detect Q-value changes for animation
  useEffect(() => {
    if (cellInfo.qValueChange) {
      setQValueChanged(true);
      const timer = setTimeout(() => setQValueChanged(false), getAnimationDuration('cell') * 2);
      return () => clearTimeout(timer);
    }
  }, [cellInfo.qValueChange, getAnimationDuration]);

  const cellVariants = {
    initial: { scale: 1, opacity: 1 },
    hover: { scale: 1.05, transition: { duration: 0.15 } },
    click: { scale: 0.95, transition: { duration: 0.1 } },
    qChange: { 
      scale: [1, 1.1, 1], 
      transition: { duration: getAnimationDuration('cell') / 1000 }
    },
    highlight: {
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
      scale: 1.02
    }
  };

  return (
    <motion.div
      className={`grid-cell ${cellInfo.cellClass}`}
      variants={cellVariants}
      initial="initial"
      animate={[
        qValueChanged && animationSettings.cellAnimations ? 'qChange' : '',
        isHighlighted ? 'highlight' : ''
      ].filter(Boolean)}
      whileHover={animationSettings.cellAnimations ? "hover" : undefined}
      whileTap={animationSettings.cellAnimations ? "click" : undefined}
      onClick={onClick}
      onHoverStart={onHover}
      style={{ backgroundColor: cellInfo.backgroundColor }}
    >
      <AnimatePresence mode="wait">
        {cellInfo.icon && (
          <motion.div
            key={cellInfo.type}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: getAnimationDuration('cell') / 1000 }}
          >
            {cellInfo.icon}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Q-value display with smooth transitions */}
      <AnimatePresence>
        {cellInfo.showQValue && (
          <motion.div
            className="absolute inset-0 flex items-end justify-end p-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="text-xs font-bold bg-black/20 px-1 rounded"
              animate={qValueChanged ? { color: ['#fff', '#f59e0b', '#fff'] } : {}}
            >
              {cellInfo.qValue}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});