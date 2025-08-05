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
}