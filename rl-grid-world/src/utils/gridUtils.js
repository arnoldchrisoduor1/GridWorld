import {
    CELL_TYPES,
    ACTIONS,
    ACTION_VECTORS,
    GRID_PRESETS,
    GRID_SIZE
} from './constants';

// creating an empty grid of specified size.
export const createEmptyGrid = (size) => {
    return Array(size).fill(null).map(() => Array(size).fill(CELL_TYPES.EMPTY));
}

// Check if a position is valid within the grid bounds.
export const isValidPosition = (row, col, gridSize) => {
    return row >= 0 && row < gridSize && col && col < gridSize;
}

// check if a position is a wall.
export const isWall = (grid, row, col) => {
    if(!isValidPosition(row, col, grid.length)) return true;
    return grid[row][col] === CELL_TYPES.WALL;
}

// get next position based on current position.
export const getNextPosition = (currentPos, action) => {
    const[row, col] = currentPos;
    const [dRow, dCol] = ACTION_VECTORS[action];
    return [row + dRow, col + dCol];
};

// get valid actions from given positions.
export const getValidActions = (grid, position) => {
    const [row, col] = position;
    const validActions = [];

    Object.keys(ACTIONS).forEach(actionKey => {
        const action = ACTIONS[actionKey];
        const [nextRow, nextCol] = getNextPosition([row, col], action);

        if(isValidPosition(nextRow, nextCol, grid.length) &&
            !isWall(GRID_PRESETS, nextRow, nextCol)) {
                validActions.push(action);
            }
    });
    return validActions;
};

// calculating the manhattan distance between two positions.
export const manhattanDistance = (pos1, pos2) => {
  const [r1, c1] = pos1;
  const [r2, c2] = pos2;
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
};

// calculating the euclidian distance between two positions.
export const euclidianDistance = (pos1, pos2) => {
    const [r1, c1] = pos1;
    const [r2, c2] = pos2;
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(c1 - c2, 2));
};

// converting 2d positions into 1d state indices.
export const positionToState = (position, gridSize) => {
    const [row, col] = position;
    return row * gridSize + col;
};


// convert 1d state index to 2d state position.
export const stateToPosition = (state, gridSize) => {
    const row = Math.floor(state / gridSize);
    const col = state % gridSize;
    return [row, col];
}

// creating teh grid from the present configuration.
export const createPresetGrid = (preset, size = GRID_SIZE.DEFAULT) => {
  const grid = createEmptyGrid(size);
  
  switch (preset) {
    case GRID_PRESETS.SIMPLE_MAZE:
      return createSimpleMaze(grid, size);
    
    case GRID_PRESETS.COMPLEX_MAZE:
      return createComplexMaze(grid, size);
    
    case GRID_PRESETS.FOUR_ROOMS:
      return createFourRooms(grid, size);
    
    case GRID_PRESETS.EMPTY:
    default:
      return grid;
  }
};

/**
 * Create a simple maze pattern
 */
const createSimpleMaze = (grid, size) => {
  const newGrid = [...grid];
  
  // Add some walls to create a simple maze
  if (size >= 5) {
    // Vertical wall
    for (let i = 1; i < size - 1; i++) {
      if (i !== Math.floor(size / 2)) {
        newGrid[i][Math.floor(size / 2)] = CELL_TYPES.WALL;
      }
    }
    
    // Horizontal wall
    for (let j = 1; j < size - 1; j++) {
      if (j !== Math.floor(size / 2)) {
        newGrid[Math.floor(size / 2)][j] = CELL_TYPES.WALL;
      }
    }
  }
  
  return newGrid;
};

/**
 * Create a more complex maze pattern
 */
const createComplexMaze = (grid, size) => {
  const newGrid = [...grid];
  
  if (size >= 8) {
    // Create multiple corridors and obstacles
    const walls = [
      [1, 1], [1, 2], [1, 3],
      [3, 5], [3, 6],
      [5, 1], [5, 2],
      [6, 4], [6, 5], [6, 6]
    ];
    
    walls.forEach(([row, col]) => {
      if (row < size && col < size) {
        newGrid[row][col] = CELL_TYPES.WALL;
      }
    });
  }
  
  return newGrid;
};

/**
 * Create a four rooms environment
 */
const createFourRooms = (grid, size) => {
  const newGrid = [...grid];
  
  if (size >= 7) {
    const mid = Math.floor(size / 2);
    
    // Create walls to divide into four rooms
    for (let i = 0; i < size; i++) {
      if (i !== Math.floor(mid / 2) && i !== mid + Math.floor(mid / 2)) {
        newGrid[mid][i] = CELL_TYPES.WALL;
        newGrid[i][mid] = CELL_TYPES.WALL;
      }
    }
  }
  
  return newGrid;
};

/**
 * Get all positions of a specific cell type
 */
export const getPositionsOfType = (grid, cellType) => {
  const positions = [];
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === cellType) {
        positions.push([row, col]);
      }
    }
  }
  
  return positions;
};

/**
 * Clone a grid deeply
 */
export const cloneGrid = (grid) => {
  return grid.map(row => [...row]);
};

/**
 * Check if two positions are equal
 */
export const positionsEqual = (pos1, pos2) => {
  return pos1[0] === pos2[0] && pos1[1] === pos2[1];
};

/**
 * Get the optimal path using A* algorithm (for comparison purposes)
 */
export const getOptimalPath = (grid, startPos, goalPos) => {
  const openSet = [[...startPos, 0, 0, [startPos]]]; // [row, col, g, f, path]
  const closedSet = new Set();
  
  while (openSet.length > 0) {
    // Sort by f value and get the node with lowest f
    openSet.sort((a, b) => a[3] - b[3]);
    const [row, col, g, f, path] = openSet.shift();
    
    const nodeKey = `${row},${col}`;
    if (closedSet.has(nodeKey)) continue;
    closedSet.add(nodeKey);
    
    // Check if we reached the goal
    if (positionsEqual([row, col], goalPos)) {
      return path;
    }
    
    // Explore neighbors
    Object.values(ACTIONS).forEach(action => {
      const [nextRow, nextCol] = getNextPosition([row, col], action);
      
      if (isValidPosition(nextRow, nextCol, grid.length) && 
          !isWall(grid, nextRow, nextCol) &&
          !closedSet.has(`${nextRow},${nextCol}`)) {
        
        const newG = g + 1;
        const h = manhattanDistance([nextRow, nextCol], goalPos);
        const newF = newG + h;
        const newPath = [...path, [nextRow, nextCol]];
        
        openSet.push([nextRow, nextCol, newG, newF, newPath]);
      }
    });
  }
  
  return []; // incase no path is found.
};

/**
 * Generate random valid positions for start and goal
 */
export const generateRandomPositions = (grid) => {
  const emptyPositions = [];
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === CELL_TYPES.EMPTY) {
        emptyPositions.push([row, col]);
      }
    }
  }
  
  if (emptyPositions.length < 2) {
    return {
      start: [0, 0],
      goal: [grid.length - 1, grid.length - 1]
    };
  }
  
  const shuffled = emptyPositions.sort(() => Math.random() - 0.5);
  return {
    start: shuffled[0],
    goal: shuffled[1]
  };
};
