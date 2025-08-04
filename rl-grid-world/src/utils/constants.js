export const GRID_SIZE = {
    MIN: 3,
    MAX: 15,
    DEFAULT: 8
}

export const CELL_TYPES = {
    EMPTY: 'empty',
    WALL: 'wall',
    START: 'start',
    GOAL: 'goal',
    AGENT: 'agent'
}

export const ACTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
}

export const ACTION_VECTORS = {
    [ACTIONS.UP]: [-1, 0],
    [ACTIONS.DOWN]: [1, 0],
    [ACTIONS.LEFT]: [0, -1],
    [ACTIONS.RIGHT]: [0, 1]
}

export const ACTION_SYMBOLS = {
  [ACTIONS.UP]: '↑',
  [ACTIONS.DOWN]: '↓',
  [ACTIONS.LEFT]: '←',
  [ACTIONS.RIGHT]: '→'
};

// CONSTANTS FOR THE REINFORCEMENT ALGOS.
export const RL_PARAMS = {
    LEARNING_RATE: {
        MIN: 0.01,
        MAX: 1.0,
        DEFAULT: 0.1,
        STEP: 0.01
    },
    DISCOUNT_FACTOR: {
        MIN: 0.0,
        MAX: 1.0,
        DEFAULT: 0.9,
        STEP: 0.01
    },
    EPSILON: {
        MIN: 0.0,
        MAX: 1.0,
        DEFAULT: 0.1,
        STEP: 0.01
    },
    EPSILON_DECAY: {
    MIN: 0.990,
    MAX: 0.999,
    DEFAULT: 0.995,
    STEP: 0.001
  },
  MIN_EPSILON: {
    MIN: 0.01,
    MAX: 0.2,
    DEFAULT: 0.01,
    STEP: 0.01
  }
};