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

// Reward Structure Constants
export const REWARDS = {
  DEFAULT: {
    GOAL: 100,
    STEP: -1,
    WALL: -10,
    OUT_OF_BOUNDS: -10
  },
  SPARSE: {
    GOAL: 1,
    STEP: 0,
    WALL: 0,
    OUT_OF_BOUNDS: 0
  },
  DENSE: {
    GOAL: 100,
    STEP: -1,
    WALL: -50,
    OUT_OF_BOUNDS: -50
  }
};

// Training constants.
export const TRAINING = {
    MAX_EPISODES: 1000,
    MAX_STEPS_PER_EPISODE: 200,
    CONVERGENCE_WINDOW: 50,
    CONVERGENCE_THRESHOLD: 0.01,
    ANIMATION_SPEEDS: {
        SLOW: 1000,
        MEDIUM: 300,
        FAST: 100,
        INSTANT: 0
    }
};

// UI CONSTANTS
export const UI = {
    CELL_SIZE: 'w-12 h-12',
    COLORS: {
        Q_VALUE: {
            MIN: '#fef2f2', //light red colo
            MAX: '#dcfce7' //light green
        },
        POLICY_ARROW: '#3b82f6'
    },
    ANIMATIONS: {
        CELL_TRANSITION: 'transition-all duration-200',
        AGENT_MOVE: 'transition-all duration-300 ease-in-out',
        UI_PANEL: 'transition-all duration-200'
    }
};

export const ALGORITHMS = {
    Q_LEARNING: 'q-learning',
    SARSA: 'sarsa',
    EXPECTED_SARSA: 'expected-sarsa'
};

export const EXPLORATION_STRATEGIES = {
    EPSILON_GREEDY: 'epsilon-greedy',
    UCB: 'ucb',
    BOLTZMAN: 'boltzman'
};

export const GRID_PRESENTS = {
    EMPTY: 'empty',
    SIMPLE_MAZE: 'simple-maze',
    COMPLEX_MAZE: 'complex-maze',
    FOUR_ROOMS: 'four-rooms'
};

export const DEFULT_GRID_CONFIG = {
    size: GRID_SIZE.DEFAULT,
    startPos: [0, 0],
    goalPos: [GRID_SIZE.DEFAULT - 1, GRID_SIZE.DEFAULT - 1],
    walls: [],
    present: GRID_PRESENTS.EMPTY
}