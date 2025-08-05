import React, { memo } from 'react';
import { 
  Target, 
  Play, 
  User, 
  Square,
  MapPin
} from 'lucide-react';
import { CELL_TYPES } from '../utils/constants.js';

/**
 * Individual grid cell component with rich visual states
 */
const GridCell = memo(({ 
  cellInfo,
  onCellClick,
  onCellHover,
  onCellLeave,
  showCoordinates = false,
  showDistance = false,
  qValue = null,
  policyArrow = null,
  isAnimating = false,
  className = ''
}) => {
  const {
    isStart,
    isGoal,
    isAgent,
    isWall,
    isEmpty,
    isHighlighted,
    isSelected,
    isOnOptimalPath,
    distance,
    coordinates
  } = cellInfo;

  const [row, col] = coordinates;

  // Calculate background color based on cell state
  const getBackgroundColor = () => {
    if (isWall) return 'bg-gray-700';
    if (isStart) return 'bg-green-500';
    if (isGoal) return 'bg-amber-500';
    if (isAgent) return 'bg-blue-500';
    if (isSelected) return 'bg-blue-200';
    if (isHighlighted) return 'bg-purple-200';
    if (isOnOptimalPath) return 'bg-green-200';
    
    // Q-value coloring
    if (qValue !== null) {
      const intensity = Math.min(Math.abs(qValue) / 10, 1);
      if (qValue > 0) {
        return `bg-green-${Math.floor(intensity * 400) + 100}`;
      } else if (qValue < 0) {
        return `bg-red-${Math.floor(intensity * 400) + 100}`;
      }
    }
    
    // Distance heatmap coloring
    if (showDistance && distance !== null && distance !== Infinity) {
      const maxDistance = 20; // Adjust based on typical grid sizes
      const intensity = Math.min(distance / maxDistance, 1);
      const colorValue = Math.floor((1 - intensity) * 400) + 100;
      return `bg-blue-${colorValue}`;
    }
    
    return 'bg-white';
  };

  // Calculate border styles
  const getBorderStyle = () => {
    let borderClass = 'border border-gray-300';
    
    if (isSelected) {
      borderClass += ' border-blue-500 border-2';
    } else if (isHighlighted) {
      borderClass += ' border-purple-400 border-2';
    } else if (isOnOptimalPath) {
      borderClass += ' border-green-400 border-2';
    }
    
    return borderClass;
  };

  // Get cell icon
  const getCellIcon = () => {
    if (isAgent) return <User className="w-6 h-6 text-white" />;
    if (isStart) return <Play className="w-5 h-5 text-white" />;
    if (isGoal) return <Target className="w-5 h-5 text-white" />;
    if (isWall) return <Square className="w-4 h-4 text-gray-400" />;
    
    // Policy arrow
    if (policyArrow) {
      return (
        <div className="text-blue-600 font-bold text-lg">
          {policyArrow}
        </div>
      );
    }
    
    return null;
  };

  // Get text content
  const getTextContent = () => {
    const content = [];
    
    // Coordinates
    if (showCoordinates) {
      content.push(
        <div key="coords" className="text-xs text-gray-500 absolute top-0 left-0 p-1">
          {row},{col}
        </div>
      );
    }
    
    // Q-value
    if (qValue !== null && Math.abs(qValue) > 0.01) {
      content.push(
        <div key="qvalue" className="text-xs font-mono text-gray-700 absolute bottom-0 right-0 p-1">
          {qValue.toFixed(2)}
        </div>
      );
    }
    
    // Distance
    if (showDistance && distance !== null && distance !== Infinity) {
      content.push(
        <div key="distance" className="text-xs text-gray-600 absolute top-0 right-0 p-1">
          {distance}
        </div>
      );
    }
    
    return content;
  };

  // Handle click with coordinates
  const handleClick = (e) => {
    e.preventDefault();
    if (onCellClick) {
      onCellClick(row, col, e);
    }
  };

  // Handle hover
  const handleMouseEnter = (e) => {
    if (onCellHover) {
      onCellHover(row, col, e);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = (e) => {
    if (onCellLeave) {
      onCellLeave(row, col, e);
    }
  };

  // Animation classes
  const getAnimationClasses = () => {
    let classes = 'transition-all duration-200';
    
    if (isAnimating) {
      classes += ' animate-pulse';
    }
    
    if (isAgent) {
      classes += ' animate-bounce-subtle';
    }
    
    return classes;
  };

  // Combine all classes
  const cellClasses = `
    grid-cell
    ${getBackgroundColor()}
    ${getBorderStyle()}
    ${getAnimationClasses()}
    cursor-pointer
    hover:shadow-md
    active:scale-95
    relative
    select-none
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      className={cellClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`Cell (${row}, ${col})${isStart ? ' - Start' : ''}${isGoal ? ' - Goal' : ''}${isWall ? ' - Wall' : ''}${qValue !== null ? ` - Q: ${qValue.toFixed(3)}` : ''}${distance !== null && distance !== Infinity ? ` - Dist: ${distance}` : ''}`}
      role="gridcell"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      }}
    >
      {/* Main cell icon */}
      <div className="flex items-center justify-center">
        {getCellIcon()}
      </div>
      
      {/* Text overlays */}
      {getTextContent()}
      
      {/* Special effects for goal */}
      {isGoal && (
        <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20" />
      )}
      
      {/* Agent trail effect */}
      {isAgent && (
        <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse opacity-30" />
      )}
    </div>
  );
});

GridCell.displayName = 'GridCell';

export default GridCell;