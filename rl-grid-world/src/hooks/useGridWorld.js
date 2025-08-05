import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CELL_TYPES,
  GRID_SIZE,
  DEFAULT_GRID_CONFIG,
  GRID_PRESETS,
  REWARDS
} from '../utils/constants.js';
import {
  createEmptyGrid,
  createPresetGrid,
  cloneGrid,
  isValidPosition,
  isWall,
  getPositionsOfType,
  positionsEqual,
  generateRandomPositions,
  getOptimalPath,
  manhattanDistance
} from '../utils/gridUtils.js';

/**
 * Custom hook for managing grid world state and operations
 */
export const useGridWorld = (initialConfig = DEFAULT_GRID_CONFIG) => {
  // Core grid state
  const [gridSize, setGridSize] = useState(initialConfig.size);
  const [grid, setGrid] = useState(() => createPresetGrid(initialConfig.preset, initialConfig.size));
  const [startPos, setStartPos] = useState(initialConfig.startPos);
  const [goalPos, setGoalPos] = useState(initialConfig.goalPos);
  const [agentPos, setAgentPos] = useState(initialConfig.startPos);
  
  // Grid editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState(CELL_TYPES.WALL);
  const [selectedCells, setSelectedCells] = useState(new Set());
  
  // Visualization state
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const [showDistanceHeatmap, setShowDistanceHeatmap] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState(new Set());
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Current preset
  const [currentPreset, setCurrentPreset] = useState(initialConfig.preset);

  /**
   * Calculate optimal path from start to goal
   */
  const optimalPath = useMemo(() => {
    return getOptimalPath(grid, startPos, goalPos);
  }, [grid, startPos, goalPos]);

  /**
   * Calculate distance heatmap from goal
   */
  const distanceHeatmap = useMemo(() => {
    const heatmap = Array(gridSize).fill(null).map(() => Array(gridSize).fill(Infinity));
    
    // BFS to calculate shortest distances
    const queue = [[...goalPos, 0]];
    const visited = new Set([`${goalPos[0]},${goalPos[1]}`]);
    
    while (queue.length > 0) {
      const [row, col, dist] = queue.shift();
      heatmap[row][col] = dist;
      
      // Check all four directions
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      directions.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        const key = `${newRow},${newCol}`;
        
        if (isValidPosition(newRow, newCol, gridSize) &&
            !isWall(grid, newRow, newCol) &&
            !visited.has(key)) {
          visited.add(key);
          queue.push([newRow, newCol, dist + 1]);
        }
      });
    }
    
    return heatmap;
  }, [grid, goalPos, gridSize]);

  /**
   * Get grid statistics
   */
  const gridStats = useMemo(() => {
    const totalCells = gridSize * gridSize;
    const wallCells = getPositionsOfType(grid, CELL_TYPES.WALL).length;
    const emptyCells = totalCells - wallCells;
    const optimalSteps = optimalPath.length - 1;
    const connectivity = optimalSteps > 0 ? 'Connected' : 'Disconnected';
    
    return {
      totalCells,
      wallCells,
      emptyCells,
      wallPercentage: ((wallCells / totalCells) * 100).toFixed(1),
      optimalSteps,
      connectivity,
      difficulty: optimalSteps > 0 ? Math.min(5, Math.ceil(optimalSteps / (gridSize * 2))) : 0
    };
  }, [grid, gridSize, optimalPath]);

  /**
   * Save current state to history
   */
  const saveToHistory = useCallback(() => {
    const state = {
      grid: cloneGrid(grid),
      startPos: [...startPos],
      goalPos: [...goalPos],
      gridSize,
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  }, [grid, startPos, goalPos, gridSize, history, historyIndex]);

  /**
   * Update grid size and recreate grid
   */
  const updateGridSize = useCallback((newSize) => {
    if (newSize < GRID_SIZE.MIN || newSize > GRID_SIZE.MAX) return;
    
    saveToHistory();
    setGridSize(newSize);
    setGrid(createPresetGrid(currentPreset, newSize));
    
    // Adjust start and goal positions if they're out of bounds
    const maxPos = newSize - 1;
    setStartPos(prev => [
      Math.min(prev[0], maxPos),
      Math.min(prev[1], maxPos)
    ]);
    setGoalPos(prev => [
      Math.min(prev[0], maxPos),
      Math.min(prev[1], maxPos)
    ]);
    setAgentPos(prev => [
      Math.min(prev[0], maxPos),
      Math.min(prev[1], maxPos)
    ]);
  }, [saveToHistory, currentPreset]);

  /**
   * Load a preset grid
   */
  const loadPreset = useCallback((preset) => {
    saveToHistory();
    const newGrid = createPresetGrid(preset, gridSize);
    setGrid(newGrid);
    setCurrentPreset(preset);
    
    // Generate random start and goal positions for non-empty presets
    if (preset !== GRID_PRESETS.EMPTY) {
      const { start, goal } = generateRandomPositions(newGrid);
      setStartPos(start);
      setGoalPos(goal);
      setAgentPos(start);
    }
  }, [gridSize, saveToHistory]);

  /**
   * Clear the grid
   */
  const clearGrid = useCallback(() => {
    saveToHistory();
    setGrid(createEmptyGrid(gridSize));
    setCurrentPreset(GRID_PRESETS.EMPTY);
  }, [gridSize, saveToHistory]);

  /**
   * Reset agent to start position
   */
  const resetAgent = useCallback(() => {
    setAgentPos([...startPos]);
  }, [startPos]);

  /**
   * Move agent to a specific position
   */
  const moveAgent = useCallback((newPos) => {
    const [row, col] = newPos;
    if (isValidPosition(row, col, gridSize) && !isWall(grid, row, col)) {
      setAgentPos([row, col]);
      return true;
    }
    return false;
  }, [grid, gridSize]);

  /**
   * Toggle cell type at position
   */
  const toggleCell = useCallback((row, col) => {
    if (!isValidPosition(row, col, gridSize)) return;
    
    // Don't allow editing start or goal positions
    if (positionsEqual([row, col], startPos) || positionsEqual([row, col], goalPos)) {
      return;
    }
    
    saveToHistory();
    setGrid(prev => {
      const newGrid = cloneGrid(prev);
      newGrid[row][col] = newGrid[row][col] === CELL_TYPES.WALL ? CELL_TYPES.EMPTY : CELL_TYPES.WALL;
      return newGrid;
    });
  }, [gridSize, startPos, goalPos, saveToHistory]);

  /**
   * Set cell type at position
   */
  const setCellType = useCallback((row, col, cellType) => {
    if (!isValidPosition(row, col, gridSize)) return;
    
    saveToHistory();
    setGrid(prev => {
      const newGrid = cloneGrid(prev);
      newGrid[row][col] = cellType;
      return newGrid;
    });
  }, [gridSize, saveToHistory]);

  /**
   * Update start position
   */
  const updateStartPos = useCallback((newPos) => {
    const [row, col] = newPos;
    if (isValidPosition(row, col, gridSize) && 
        !isWall(grid, row, col) && 
        !positionsEqual(newPos, goalPos)) {
      saveToHistory();
      setStartPos([row, col]);
      setAgentPos([row, col]);
    }
  }, [grid, gridSize, goalPos, saveToHistory]);

  /**
   * Update goal position
   */
  const updateGoalPos = useCallback((newPos) => {
    const [row, col] = newPos;
    if (isValidPosition(row, col, gridSize) && 
        !isWall(grid, row, col) && 
        !positionsEqual(newPos, startPos)) {
      saveToHistory();
      setGoalPos([row, col]);
    }
  }, [grid, gridSize, startPos, saveToHistory]);

  /**
   * Generate random start and goal positions
   */
  const randomizePositions = useCallback(() => {
    const { start, goal } = generateRandomPositions(grid);
    saveToHistory();
    setStartPos(start);
    setGoalPos(goal);
    setAgentPos(start);
  }, [grid, saveToHistory]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setGrid(cloneGrid(prevState.grid));
      setStartPos([...prevState.startPos]);
      setGoalPos([...prevState.goalPos]);
      setGridSize(prevState.gridSize);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setGrid(cloneGrid(nextState.grid));
      setStartPos([...nextState.startPos]);
      setGoalPos([...nextState.goalPos]);
      setGridSize(nextState.gridSize);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  /**
   * Get cell display information
   */
  const getCellInfo = useCallback((row, col) => {
    const isStart = positionsEqual([row, col], startPos);
    const isGoal = positionsEqual([row, col], goalPos);
    const isAgent = positionsEqual([row, col], agentPos);
    const isWallCell = isWall(grid, row, col);
    const isHighlighted = highlightedCells.has(`${row},${col}`);
    const isSelected = selectedCells.has(`${row},${col}`);
    const isOnOptimalPath = showOptimalPath && optimalPath.some(pos => 
      positionsEqual(pos, [row, col])
    );
    
    const distance = showDistanceHeatmap ? distanceHeatmap[row][col] : null;
    
    return {
      isStart,
      isGoal,
      isAgent,
      isWall: isWallCell,
      isEmpty: !isWallCell && !isStart && !isGoal,
      isHighlighted,
      isSelected,
      isOnOptimalPath,
      distance,
      coordinates: [row, col]
    };
  }, [
    startPos, goalPos, agentPos, grid, highlightedCells, selectedCells,
    showOptimalPath, optimalPath, showDistanceHeatmap, distanceHeatmap
  ]);

  /**
   * Highlight specific cells
   */
  const highlightCells = useCallback((positions) => {
    const cellSet = new Set(positions.map(pos => `${pos[0]},${pos[1]}`));
    setHighlightedCells(cellSet);
  }, []);

  /**
   * Clear all highlights
   */
  const clearHighlights = useCallback(() => {
    setHighlightedCells(new Set());
  }, []);

  /**
   * Export grid configuration
   */
  const exportConfig = useCallback(() => {
    return {
      gridSize,
      grid: cloneGrid(grid),
      startPos: [...startPos],
      goalPos: [...goalPos],
      preset: currentPreset,
      stats: gridStats,
      timestamp: Date.now()
    };
  }, [grid, gridSize, startPos, goalPos, currentPreset, gridStats]);

  /**
   * Import grid configuration
   */
  const importConfig = useCallback((config) => {
    try {
      saveToHistory();
      setGridSize(config.gridSize);
      setGrid(cloneGrid(config.grid));
      setStartPos([...config.startPos]);
      setGoalPos([...config.goalPos]);
      setAgentPos([...config.startPos]);
      setCurrentPreset(config.preset || GRID_PRESETS.EMPTY);
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }, [saveToHistory]);

  // Initialize history on first render
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, []);

  // Return the hook interface
  return {
    // Grid state
    grid,
    gridSize,
    startPos,
    goalPos,
    agentPos,
    currentPreset,
    
    // Computed values
    optimalPath,
    distanceHeatmap,
    gridStats,
    
    // Grid operations
    updateGridSize,
    loadPreset,
    clearGrid,
    resetAgent,
    moveAgent,
    toggleCell,
    setCellType,
    updateStartPos,
    updateGoalPos,
    randomizePositions,
    
    // History operations
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    
    // Cell information
    getCellInfo,
    
    // Visualization controls
    showOptimalPath,
    setShowOptimalPath,
    showDistanceHeatmap,
    setShowDistanceHeatmap,
    highlightCells,
    clearHighlights,
    
    // Editing state
    isEditing,
    setIsEditing,
    editMode,
    setEditMode,
    selectedCells,
    setSelectedCells,
    
    // Import/Export
    exportConfig,
    importConfig,
    
    // Utility functions
    isValidPosition: (row, col) => isValidPosition(row, col, gridSize),
    isWall: (row, col) => isWall(grid, row, col),
    manhattanDistance: (pos1, pos2) => manhattanDistance(pos1, pos2)
  };
};