import {
    CELL_TYPES,
    ACTIONS,
    ACTION_VECTORS,
    GRID_PRESENTS,
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
            !isWall(GRID_PRESENTS, nextRow, nextCol)) {
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


// convert 1d state postion to 2d state index