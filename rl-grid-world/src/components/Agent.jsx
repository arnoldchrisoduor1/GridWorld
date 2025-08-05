import React, { useState, useEffect, useRef } from 'react';
import { User, Zap, Target, TrendingUp } from 'lucide-react';

/**
 * Animated agent component with movement trails and status indicators
 */
const Agent = ({ 
  position,
  previousPosition = null,
  isMoving = false,
  moveDirection = null,
  agentStats = null,
  showTrail = true,
  showStats = false,
  size = 'normal', // 'small', 'normal', 'large'
  className = ''
}) => {
  const [trail, setTrail] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const positionRef = useRef(position);
  const trailRef = useRef([]);

  // Size configurations
  const sizeConfig = {
    small: {
      icon: 'w-4 h-4',
      container: 'w-8 h-8',
      trail: 'w-2 h-2'
    },
    normal: {
      icon: 'w-6 h-6',
      container: 'w-12 h-12',
      trail: 'w-3 h-3'
    },
    large: {
      icon: 'w-8 h-8',
      container: 'w-16 h-16',
      trail: 'w-4 h-4'
    }
  };

  const config = sizeConfig[size] || sizeConfig.normal;

  // Update trail when position changes
  useEffect(() => {
    if (previousPosition && position) {
      const [prevRow, prevCol] = previousPosition;
      const [currRow, currCol] = position;
      
      // Only add to trail if position actually changed
      if (prevRow !== currRow || prevCol !== currCol) {
        setIsAnimating(true);
        
        // Add previous position to trail
        setTrail(prev => {
          const newTrail = [...prev, previousPosition];
          // Keep trail limited to last 10 positions
          return newTrail.slice(-10);
        });
        
        // Clear animation state after animation completes
        setTimeout(() => setIsAnimating(false), 300);
      }
    }
    
    positionRef.current = position;
  }, [position, previousPosition]);

  // Clear trail periodically
  useEffect(() => {
    if (!showTrail) {
      setTrail([]);
      return;
    }

    const clearInterval = setInterval(() => {
      setTrail(prev => prev.slice(1)); // Remove oldest trail position
    }, 2000);

    return () => clearInterval(clearInterval);
  }, [showTrail]);

  // Get movement animation classes
  const getMovementClasses = () => {
    let classes = 'transition-all duration-300 ease-in-out';
    
    if (isMoving || isAnimating) {
      classes += ' animate-pulse';
    }
    
    // Direction-based rotation
    if (moveDirection) {
      const rotations = {
        'up': 'rotate-0',
        'right': 'rotate-90',
        'down': 'rotate-180',
        'left': 'rotate-270'
      };
      classes += ` ${rotations[moveDirection] || ''}`;
    }
    
    return classes;
  };

  // Get agent status color
  const getStatusColor = () => {
    if (!agentStats) return 'text-blue-500';
    
    const { performance, exploration } = agentStats;
    
    if (performance > 0.8) return 'text-green-500';
    if (performance > 0.5) return 'text-yellow-500';
    if (exploration > 0.5) return 'text-purple-500';
    return 'text-blue-500';
  };

  // Render trail dots
  const renderTrail = () => {
    if (!showTrail || trail.length === 0) return null;
    
    return trail.map((trailPos, index) => {
      const [row, col] = trailPos;
      const opacity = (index + 1) / trail.length; // Fade out older positions
      const scale = 0.3 + (opacity * 0.7); // Scale based on age
      
      return (
        <div
          key={`trail-${row}-${col}-${index}`}
          className={`absolute ${config.trail} bg-blue-400 rounded-full transition-all duration-500`}
          style={{
            opacity: opacity * 0.6,
            transform: `scale(${scale})`,
            top: '50%',
            left: '50%',
            marginTop: `-${parseInt(config.trail.split(' ')[1].substring(2)) * 2}px`, // Center the trail dot
            marginLeft: `-${parseInt(config.trail.split(' ')[1].substring(2)) * 2}px`,
            zIndex: 1
          }}
        />
      );
    });
  };

  // Render stats overlay
  const renderStats = () => {
    if (!showStats || !agentStats) return null;
    
    const { 
      episodeReward, 
      totalSteps, 
      exploration, 
      performance,
      currentAction 
    } = agentStats;
    
    return (
      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          <span>R: {episodeReward?.toFixed(1) || 0}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Zap className="w-3 h-3" />
          <span>Steps: {totalSteps || 0}</span>
        </div>
        {currentAction && (
          <div className="flex items-center gap-2 mt-1">
            <Target className="w-3 h-3" />
            <span>{currentAction}</span>
          </div>
        )}
      </div>
    );
  };

  // Render energy/activity indicator
  const renderEnergyIndicator = () => {
    if (!agentStats) return null;
    
    const { exploration = 0, performance = 0 } = agentStats;
    const energy = Math.max(exploration, performance);
    
    return (
      <div className="absolute inset-0 rounded-full pointer-events-none">
        {/* Energy ring */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-blue-400 animate-spin"
          style={{
            borderColor: `rgba(59, 130, 246, ${energy})`,
            animationDuration: `${2 - energy}s`
          }}
        />
        
        {/* Performance glow */}
        {performance > 0.7 && (
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20" />
        )}
        
        {/* Exploration spark */}
        {exploration > 0.8 && (
          <div className="absolute inset-0 rounded-full bg-purple-400 animate-pulse opacity-30" />
        )}
      </div>
    );
  };

  const containerClasses = `
    ${config.container}
    bg-blue-500
    rounded-full
    flex
    items-center
    justify-center
    relative
    shadow-lg
    ${getMovementClasses()}
    ${getStatusColor()}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={containerClasses}>
      {/* Trail */}
      {renderTrail()}
      
      {/* Energy indicator */}
      {renderEnergyIndicator()}
      
      {/* Main agent icon */}
      <User 
        className={`${config.icon} text-white z-10 relative`}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      />
      
      {/* Stats overlay */}
      {renderStats()}
      
      {/* Movement indicator */}
      {(isMoving || isAnimating) && (
        <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-50" />
      )}
      
      {/* Success celebration */}
      {agentStats?.reachedGoal && (
        <div className="absolute inset-0 rounded-full bg-green-400 animate-bounce opacity-60" />
      )}
    </div>
  );
};

export default Agent;

/**
 * AgentTracker - Component to track and display agent movement statistics
 */
export const AgentTracker = ({ 
  agentPosition, 
  goalPosition, 
  trajectory = [],
  episodeStats = null,
  className = ''
}) => {
  const [distanceToGoal, setDistanceToGoal] = useState(null);
  const [pathEfficiency, setPathEfficiency] = useState(null);

  // Calculate distance to goal
  useEffect(() => {
    if (agentPosition && goalPosition) {
      const [agentRow, agentCol] = agentPosition;
      const [goalRow, goalCol] = goalPosition;
      const distance = Math.abs(agentRow - goalRow) + Math.abs(agentCol - goalCol);
      setDistanceToGoal(distance);
    }
  }, [agentPosition, goalPosition]);

  // Calculate path efficiency
  useEffect(() => {
    if (trajectory.length > 1 && goalPosition && agentPosition) {
      const optimalDistance = Math.abs(agentPosition[0] - goalPosition[0]) + 
                             Math.abs(agentPosition[1] - goalPosition[1]);
      const actualSteps = trajectory.length - 1;
      const efficiency = optimalDistance > 0 ? Math.min(optimalDistance / actualSteps, 1) : 1;
      setPathEfficiency(efficiency);
    }
  }, [trajectory, goalPosition, agentPosition]);

  return (
    <div className={`agent-tracker bg-white p-3 rounded-lg shadow-sm border ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Agent Status</h4>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Position:</span>
          <div className="font-mono">
            {agentPosition ? `(${agentPosition[0]}, ${agentPosition[1]})` : 'N/A'}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500">Distance to Goal:</span>
          <div className="font-mono">
            {distanceToGoal !== null ? `${distanceToGoal} steps` : 'N/A'}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500">Path Length:</span>
          <div className="font-mono">
            {trajectory.length > 0 ? `${trajectory.length - 1} steps` : '0 steps'}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500">Efficiency:</span>
          <div className="font-mono">
            {pathEfficiency !== null ? 
              `${(pathEfficiency * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>
      
      {episodeStats && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Episode Reward:</span>
              <div className="font-mono">
                {episodeStats.totalReward?.toFixed(1) || '0.0'}
              </div>
            </div>
            
            <div>
              <span className="text-gray-500">Success:</span>
              <div className={`font-medium ${episodeStats.reachedGoal ? 'text-green-600' : 'text-red-600'}`}>
                {episodeStats.reachedGoal ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};