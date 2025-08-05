import React, { createContext, useContext, useState, useCallback } from 'react';

const AnimationContext = createContext();

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within AnimationProvider');
  }
  return context;
};

export const AnimationProvider = ({ children }) => {
  const [animationSettings, setAnimationSettings] = useState({
    enableAnimations: true,
    animationSpeed: 'normal',
    cellAnimations: true,
    agentAnimations: true,
    chartAnimations: true,
    panelAnimations: true,
  });

  const [activeAnimations, setActiveAnimations] = useState(new Set());

  const getAnimationDuration = useCallback((type = 'default') => {
    if (!animationSettings.enableAnimations) return 0;
    
    const speeds = {
      slow: { default: 800, cell: 400, agent: 600, chart: 1200, panel: 500 },
      normal: { default: 400, cell: 200, agent: 300, chart: 600, panel: 250 },
      fast: { default: 200, cell: 100, agent: 150, chart: 300, panel: 125 },
      instant: { default: 0, cell: 0, agent: 0, chart: 0, panel: 0 }
    };
    
    return speeds[animationSettings.animationSpeed][type] || speeds[animationSettings.animationSpeed].default;
  }, [animationSettings]);

  const registerAnimation = useCallback((id) => {
    setActiveAnimations(prev => new Set([...prev, id]));
  }, []);

  const unregisterAnimation = useCallback((id) => {
    setActiveAnimations(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = {
    animationSettings,
    setAnimationSettings,
    getAnimationDuration,
    activeAnimations,
    registerAnimation,
    unregisterAnimation,
    isAnimating: activeAnimations.size > 0
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};