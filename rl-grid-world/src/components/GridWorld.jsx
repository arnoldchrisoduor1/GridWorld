import React, { useState, useCallback, useRef, useEffect } from 'react';
import GridCell from './GridCell.jsx';
import { CELL_TYPES } from '../utils/constants.js';

/**
 * Main grid world component that renders the entire grid
 */
const GridWorld = ({ 
  gridHook,
  qTable = null,
  policy = null,
  showQValues = false,
  showPolicy = false,
  showCoordinates = false,
  showDistance = false,
  animatingCells = new Set(),
  onCellClick,
  onCellHover,
  onCellLeave,
  className = ''
}) => {
  const {
    grid,
    gridSize,
    getCellInfo,
    isEditing,
    editMode,
    toggleCell,
    setCellType,
    updateStartPos,
    updateGoalPos
  } = gridHook;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const gridRef = useRef(null);

  // Handle cell interactions
  const handleCellClick = useCallback((row, col, event) => {
    const cellInfo = getCellInfo(row, col);
    
    if (onCellClick) {
      onCellClick(row, col, cellInfo, event);
      return;
    }

    // Default click behavior based on mode
    if (isEditing) {
      switch (editMode) {
        case CELL_TYPES.START:
          updateStartPos([row, col]);
          break;
        case CELL_TYPES.GOAL:
          updateGoalPos([row, col]);
          break;
        case CELL_TYPES.WALL:
        case CELL_TYPES.EMPTY:
          toggleCell(row, col);
          break;
        default:
          break;
      }
    }
  }, [getCellInfo, onCellClick, isEditing, editMode, updateStartPos, updateGoalPos, toggleCell]);

  // Handle cell hover
  const handleCellHover = useCallback((row, col, event) => {
    const cellInfo = getCellInfo(row, col);
    setHoveredCell([row, col]);
    
    if (onCellHover) {
      onCellHover(row, col, cellInfo, event);
    }

    // Handle drag painting for walls
    if (isDragging && isEditing && editMode === CELL_TYPES.WALL) {
      if (!cellInfo.isStart && !cellInfo.isGoal) {
        setCellType(row, col, cellInfo.isWall ? CELL_TYPES.EMPTY : CELL_TYPES.WALL);
      }
    }
  }, [getCellInfo, onCellHover, isDragging, isEditing, editMode, setCellType]);

  // Handle cell leave
  const handleCellLeave = useCallback((row, col, event) => {
    const cellInfo = getCellInfo(row, col);
    setHoveredCell(null);
    
    if (onCellLeave) {
      onCellLeave(row, col, cellInfo, event);
    }
  }, [getCellInfo, onCellLeave]);

  // Handle mouse down for drag operations
  const handleMouseDown = useCallback((row, col, event) => {
    if (isEditing && editMode === CELL_TYPES.WALL) {
      setIsDragging(true);
      setDragStart([row, col]);
      event.preventDefault();
    }
  }, [isEditing, editMode]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Add global mouse up listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Get Q-value for a cell
  const getQValue = useCallback((row, col) => {
    if (!showQValues || !qTable) return null;
    
    const state = row * gridSize + col;
    if (state >= qTable.length) return null;
    
    // Return the maximum Q-value for this state
    return Math.max(...qTable[state]);
  }, [showQValues, qTable, gridSize]);

  // Get policy arrow for a cell
  const getPolicyArrow = useCallback((row, col) => {
    if (!showPolicy || !policy) return null;
    
    const state = row * gridSize + col;
    if (state >= policy.length) return null;
    
    const action = policy[state];
    const arrows = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    };
    
    return arrows[action] || null;
  }, [showPolicy, policy, gridSize]);

  // Calculate grid container size
  const getGridStyle = () => {
    const cellSize = 48; // 12 * 4px (w-12 h-12)
    const gap = 1; // 1px gap
    const totalSize = (cellSize * gridSize) + (gap * (gridSize - 1));
    
    return {
      width: `${totalSize}px`,
      height: `${totalSize}px`,
      display: 'grid',
      gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
      gridTemplateRows: `repeat(${gridSize}, 1fr)`,
      gap: `${gap}px`
    };
  };

  // Render grid statistics
  const renderGridInfo = () => (
    <div className="mb-4 text-sm text-gray-600 flex flex-wrap gap-4">
      <span>Size: {gridSize}×{gridSize}</span>
      {hoveredCell && (
        <span>
          Hover: ({hoveredCell[0]}, {hoveredCell[1]})
        </span>
      )}
      {showQValues && qTable && (
        <span>Q-Values: Active</span>
      )}
      {showPolicy && policy && (
        <span>Policy: Active</span>
      )}
    </div>
  );

  return (
    <div className={`grid-world-container ${className}`}>
      {/* Grid information */}
      {renderGridInfo()}
      
      {/* Main grid */}
      <div 
        ref={gridRef}
        className="grid-world bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 mx-auto"
        style={getGridStyle()}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cellInfo = getCellInfo(rowIndex, colIndex);
            const qValue = getQValue(rowIndex, colIndex);
            const policyArrow = getPolicyArrow(rowIndex, colIndex);
            const isAnimating = animatingCells.has(`${rowIndex},${colIndex}`);
            
            return (
              <GridCell
                key={`${rowIndex}-${colIndex}`}
                cellInfo={cellInfo}
                qValue={qValue}
                policyArrow={policyArrow}
                showCoordinates={showCoordinates}
                showDistance={showDistance}
                isAnimating={isAnimating}
                onCellClick={handleCellClick}
                onCellHover={handleCellHover}
                onCellLeave={handleCellLeave}
                onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
              />
            );
          })
        )}
      </div>
      
      {/* Grid legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span>Goal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700 rounded"></div>
          <span>Wall</span>
        </div>
        {showQValues && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-red-200 to-green-200 rounded"></div>
            <span>Q-Values</span>
          </div>
        )}
      </div>
      
      {/* Editing instructions */}
      {isEditing && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Editing Mode:</strong> {editMode}
            {editMode === CELL_TYPES.WALL && (
              <div className="mt-1">Click cells to toggle walls, or click and drag to paint</div>
            )}
            {editMode === CELL_TYPES.START && (
              <div className="mt-1">Click an empty cell to set as start position</div>
            )}
            {editMode === CELL_TYPES.GOAL && (
              <div className="mt-1">Click an empty cell to set as goal position</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GridWorld;