import { 
  ACTIONS, 
  REWARDS,
  ALGORITHMS,
  EXPLORATION_STRATEGIES
} from './constants.js';
import { 
  getNextPosition, 
  isValidPosition, 
  isWall, 
  getValidActions,
  positionToState,
  stateToPosition,
  positionsEqual
} from './gridUtils.js';

/**
 * Initialize Q-table with zeros
 */
export const initializeQTable = (gridSize) => {
  const numStates = gridSize * gridSize;
  const numActions = Object.keys(ACTIONS).length;
  
  return Array(numStates).fill(null).map(() => 
    Array(numActions).fill(0)
  );
};

/**
 * Convert action string to index
 */
export const actionToIndex = (action) => {
  const actionKeys = Object.keys(ACTIONS);
  return actionKeys.indexOf(action.toUpperCase());
};

/**
 * Convert action index to string
 */
export const indexToAction = (index) => {
  const actionValues = Object.values(ACTIONS);
  return actionValues[index];
};

/**
 * Epsilon-greedy action selection
 */
export const epsilonGreedyAction = (qTable, state, epsilon, validActions) => {
  if (validActions.length === 0) return ACTIONS.UP;
  
  if (Math.random() < epsilon) {
    // Explore: choose random valid action
    const randomIndex = Math.floor(Math.random() * validActions.length);
    return validActions[randomIndex];
  } else {
    // Exploit: choose best action among valid actions
    let bestAction = validActions[0];
    let bestValue = -Infinity;
    
    validActions.forEach(action => {
      const actionIndex = actionToIndex(action);
      const qValue = qTable[state][actionIndex];
      if (qValue > bestValue) {
        bestValue = qValue;
        bestAction = action;
      }
    });
    
    return bestAction;
  }
};

/**
 * UCB (Upper Confidence Bound) action selection
 */
export const ucbAction = (qTable, state, validActions, actionCounts, totalSteps, c = 2) => {
  if (validActions.length === 0) return ACTIONS.UP;
  
  let bestAction = validActions[0];
  let bestValue = -Infinity;
  
  validActions.forEach(action => {
    const actionIndex = actionToIndex(action);
    const qValue = qTable[state][actionIndex];
    const count = actionCounts[state][actionIndex] || 1;
    const ucbValue = qValue + c * Math.sqrt(Math.log(totalSteps + 1) / count);
    
    if (ucbValue > bestValue) {
      bestValue = ucbValue;
      bestAction = action;
    }
  });
  
  return bestAction;
};

/**
 * Boltzmann (softmax) action selection
 */
export const boltzmannAction = (qTable, state, validActions, temperature = 1.0) => {
  if (validActions.length === 0) return ACTIONS.UP;
  
  // Calculate exponentials
  const expValues = validActions.map(action => {
    const actionIndex = actionToIndex(action);
    return Math.exp(qTable[state][actionIndex] / temperature);
  });
  
  // Calculate probabilities
  const sumExp = expValues.reduce((sum, val) => sum + val, 0);
  const probabilities = expValues.map(val => val / sumExp);
  
  // Sample from probability distribution
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      return validActions[i];
    }
  }
  
  return validActions[validActions.length - 1];
};

/**
 * Select action based on exploration strategy
 */
export const selectAction = (
  qTable, 
  state, 
  validActions, 
  params,
  actionCounts = null,
  totalSteps = 0
) => {
  const { epsilon, explorationStrategy, temperature } = params;
  
  switch (explorationStrategy) {
    case EXPLORATION_STRATEGIES.UCB:
      return ucbAction(qTable, state, validActions, actionCounts, totalSteps);
    
    case EXPLORATION_STRATEGIES.BOLTZMANN:
      return boltzmannAction(qTable, state, validActions, temperature || 1.0);
    
    case EXPLORATION_STRATEGIES.EPSILON_GREEDY:
    default:
      return epsilonGreedyAction(qTable, state, epsilon, validActions);
  }
};

/**
 * Calculate reward for a transition
 */
export const calculateReward = (grid, currentPos, action, nextPos, goalPos, rewardStructure = REWARDS.DEFAULT) => {
  const [nextRow, nextCol] = nextPos;
  
  // Check if out of bounds
  if (!isValidPosition(nextRow, nextCol, grid.length)) {
    return rewardStructure.OUT_OF_BOUNDS;
  }
  
  // Check if hit a wall
  if (isWall(grid, nextRow, nextCol)) {
    return rewardStructure.WALL;
  }
  
  // Check if reached goal
  if (positionsEqual(nextPos, goalPos)) {
    return rewardStructure.GOAL;
  }
  
  // Regular step
  return rewardStructure.STEP;
};

/**
 * Q-Learning update
 */
export const qLearningUpdate = (qTable, state, action, reward, nextState, validNextActions, params) => {
  const { learningRate, discountFactor } = params;
  const actionIndex = actionToIndex(action);
  
  // Find max Q-value for next state
  let maxNextQ = -Infinity;
  if (validNextActions.length > 0) {
    validNextActions.forEach(nextAction => {
      const nextActionIndex = actionToIndex(nextAction);
      const qValue = qTable[nextState][nextActionIndex];
      if (qValue > maxNextQ) {
        maxNextQ = qValue;
      }
    });
  } else {
    maxNextQ = 0;
  }
  
  // Q-learning update rule
  const currentQ = qTable[state][actionIndex];
  const newQ = currentQ + learningRate * (reward + discountFactor * maxNextQ - currentQ);
  
  qTable[state][actionIndex] = newQ;
  
  return newQ;
};

/**
 * SARSA update
 */
export const sarsaUpdate = (qTable, state, action, reward, nextState, nextAction, params) => {
  const { learningRate, discountFactor } = params;
  const actionIndex = actionToIndex(action);
  const nextActionIndex = actionToIndex(nextAction);
  
  // SARSA update rule
  const currentQ = qTable[state][actionIndex];
  const nextQ = qTable[nextState][nextActionIndex];
  const newQ = currentQ + learningRate * (reward + discountFactor * nextQ - currentQ);
  
  qTable[state][actionIndex] = newQ;
  
  return newQ;
};

/**
 * Expected SARSA update
 */
export const expectedSarsaUpdate = (qTable, state, action, reward, nextState, validNextActions, params) => {
  const { learningRate, discountFactor, epsilon } = params;
  const actionIndex = actionToIndex(action);
  
  // Calculate expected Q-value for next state
  let expectedNextQ = 0;
  if (validNextActions.length > 0) {
    // Find best action
    let bestNextAction = validNextActions[0];
    let bestNextQ = -Infinity;
    
    validNextActions.forEach(nextAction => {
      const nextActionIndex = actionToIndex(nextAction);
      const qValue = qTable[nextState][nextActionIndex];
      if (qValue > bestNextQ) {
        bestNextQ = qValue;
        bestNextAction = nextAction;
      }
    });
    
    // Calculate expected value under epsilon-greedy policy
    const greedyProb = 1 - epsilon + epsilon / validNextActions.length;
    const randomProb = epsilon / validNextActions.length;
    
    validNextActions.forEach(nextAction => {
      const nextActionIndex = actionToIndex(nextAction);
      const qValue = qTable[nextState][nextActionIndex];
      const prob = (nextAction === bestNextAction) ? greedyProb : randomProb;
      expectedNextQ += prob * qValue;
    });
  }
  
  // Expected SARSA update rule
  const currentQ = qTable[state][actionIndex];
  const newQ = currentQ + learningRate * (reward + discountFactor * expectedNextQ - currentQ);
  
  qTable[state][actionIndex] = newQ;
  
  return newQ;
};

/**
 * Update Q-table based on algorithm type
 */
export const updateQTable = (
  qTable, 
    state, 
    action, 
    reward, 
    nextState, 
    validNextActions = [], 
    params = {},
    nextAction = null
) => {
  if(!params?.algorithm) {
    console.warn("Missing algoritm in params");
    return;
  }
  console.log("Updating Q values: ", validNextActions);
  const { algorithm } = params;
  
  switch (algorithm) {
    case ALGORITHMS.SARSA:
      if (nextAction != null) {
        return sarsaUpdate(qTable, state, action, reward, nextState, nextAction, params);
      }
      break;
    
    case ALGORITHMS.EXPECTED_SARSA:
      return expectedSarsaUpdate(qTable, state, action, reward, nextState, validNextActions, params);
    
    case ALGORITHMS.Q_LEARNING:
    default:
      return qLearningUpdate(qTable, state, action, reward, nextState, validNextActions, params);
  }
  
  return 0;
};

/**
 * Get the greedy policy from Q-table
 */
export const getGreedyPolicy = (qTable, gridSize) => {
  // Add this crucial check to handle uninitialized Q-tables
  if (!qTable || qTable.length === 0) {
    return []; // Return an empty array or null if the qTable is not ready
  }

  const numStates = qTable.length;
  const policy = Array(numStates).fill(null); // Correctly initialize based on qTable length

  for (let state = 0; state < numStates; state++) {
    const qValues = qTable[state];
    if (!qValues || qValues.length === 0) {
      // Handle cases where a specific state has no Q-values (e.g., a wall)
      policy[state] = null;
      continue;
    }
    
    let bestAction = null;
    let bestValue = -Infinity;
    
    Object.values(ACTIONS).forEach(action => {
      const actionIndex = actionToIndex(action);
      const qValue = qValues[actionIndex];
      if (qValue > bestValue) {
        bestValue = qValue;
        bestAction = action;
      }
    });
    
    policy[state] = bestAction;
  }
  
  return policy;
};

/**
 * Calculate value function from Q-table
 */
export const getValueFunction = (qTable) => {
  return qTable.map(stateActions => Math.max(...stateActions));
};

/**
 * Check if Q-table has converged
 */
export const checkConvergence = (oldQTable, newQTable, threshold = 0.01) => {
  let maxDifference = 0;
  
  for (let state = 0; state < oldQTable.length; state++) {
    for (let action = 0; action < oldQTable[state].length; action++) {
      const diff = Math.abs(oldQTable[state][action] - newQTable[state][action]);
      maxDifference = Math.max(maxDifference, diff);
    }
  }
  
  return maxDifference < threshold;
};

/**
 * Run a single episode
 */
export const runEpisode = (
  grid,
  startPos,
  goalPos,
  qTable,
  params,
  rewardStructure = REWARDS.DEFAULT,
  maxSteps = 200
) => {
  const gridSize = grid.length;
  let currentPos = [...startPos];
  let totalReward = 0;
  let steps = 0;
  const trajectory = [currentPos];
  
  while (steps < maxSteps && !positionsEqual(currentPos, goalPos)) {
    const state = positionToState(currentPos, gridSize);
    const validActions = getValidActions(grid, currentPos);
    
    if (validActions.length === 0) break;
    
    const action = selectAction(qTable, state, validActions, params);
    const nextPos = getNextPosition(currentPos, action);
    const nextState = positionToState(nextPos, gridSize);
    
    const reward = calculateReward(grid, currentPos, action, nextPos, goalPos, rewardStructure);
    totalReward += reward;
    
    // Only move if the action is valid
    if (isValidPosition(nextPos[0], nextPos[1], gridSize) && 
        !isWall(grid, nextPos[0], nextPos[1])) {
      currentPos = nextPos;
      trajectory.push([...currentPos]);
    }
    
    const validNextActions = getValidActions(grid, currentPos);
    updateQTable(qTable, state, action, reward, nextState, validNextActions, params);
    
    steps++;
  }
  
  return {
    totalReward,
    steps,
    trajectory,
    reachedGoal: positionsEqual(currentPos, goalPos)
  };
};