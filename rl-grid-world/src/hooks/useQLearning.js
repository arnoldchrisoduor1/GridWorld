import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ACTIONS,
  ALGORITHMS,
  EXPLORATION_STRATEGIES,
  RL_PARAMS,
  REWARDS,
  TRAINING
} from '../utils/constants.js';
import {
  initializeQTable,
  updateQTable,
  selectAction,
  getGreedyPolicy,
  calculateReward,
  runEpisode,
  checkConvergence
} from '../utils/rlAlgorithms.js';
import {
  positionToState,
  stateToPosition,
  getNextPosition,
  isValidPosition,
  isWall,
  positionsEqual
} from '../utils/gridUtils.js';

/**
 * Q-Learning algorithm hook with comprehensive training management
 */
export const useQLearning = (gridWorld) => {
  // Core Q-Learning State
  const [qTable, setQTable] = useState({});
  const [algorithm, setAlgorithm] = useState(ALGORITHMS.Q_LEARNING);
  const [explorationStrategy, setExplorationStrategy] = useState(EXPLORATION_STRATEGIES.EPSILON_GREEDY);
  
  // RL Parameters
  const [parameters, setParameters] = useState(RL_PARAMS);
  const [rewardStructure, setRewardStructure] = useState(REWARDS.DEFAULT);
  
  // Training State
  const [isInitialized, setIsInitialized] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);
  const [convergenceInfo, setConvergenceInfo] = useState({
    isConverged: false,
    stableEpisodes: 0,
    convergenceValue: 0
  });
  
  // Performance tracking
  const performanceRef = useRef({
    lastQTableHash: null,
    updateCount: 0,
    lastConvergenceCheck: 0
  });

  /**
   * Initialize Q-table for current grid configuration
   */
  const initializeQLearning = useCallback(() => {
    if (!gridWorld.grid || !gridWorld.startPos || !gridWorld.goalPos) {
      console.warn('Cannot initialize Q-learning: incomplete grid configuration');
      return;
    }

    const newQTable = initializeQTable(
      gridWorld.gridSize,
      Object.values(ACTIONS)
    );

    setQTable(newQTable);
    setIsInitialized(true);
    setTotalSteps(0);
    setConvergenceInfo({
      isConverged: false,
      stableEpisodes: 0,
      convergenceValue: 0
    });

    console.log(`Q-learning initialized: ${gridWorld.gridSize}×${gridWorld.gridSize} grid, ` +
                `${Object.keys(newQTable).length} states`);
  }, [gridWorld.grid, gridWorld.gridSize, gridWorld.startPos, gridWorld.goalPos]);

  /**
   * Update RL parameters with validation
   */
  const updateParameters = useCallback((newParams) => {
    const validatedParams = {
      ...parameters,
      ...newParams,
      // Ensure parameters stay within valid ranges
      learningRate: Math.max(0.001, Math.min(1.0, newParams.learningRate || parameters.learningRate)),
      discountFactor: Math.max(0.0, Math.min(1.0, newParams.discountFactor || parameters.discountFactor)),
      epsilon: Math.max(0.0, Math.min(1.0, newParams.epsilon || parameters.epsilon)),
      epsilonDecay: Math.max(0.001, Math.min(0.1, newParams.epsilonDecay || parameters.epsilonDecay)),
      minEpsilon: Math.max(0.0, Math.min(0.5, newParams.minEpsilon || parameters.minEpsilon))
    };

    setParameters(validatedParams);
  }, [parameters]);

  /**
   * Execute a single step in the environment
   */
  const executeStep = useCallback((currentState, action) => {
    const currentPos = stateToPosition(currentState, gridWorld.gridSize);
    const nextPos = getNextPosition(currentPos, action);
    
    // Check if move is valid
    const isValidMove = isValidPosition(nextPos, gridWorld.gridSize) && 
                       !isWall(gridWorld.grid, nextPos[0], nextPos[1]);
    
    const nextPosition = isValidMove ? nextPos : currentPos;
    const nextState = positionToState(nextPosition, gridWorld.gridSize);
    
    // Calculate reward
    const reward = calculateReward(
      currentPos,
      nextPosition,
      gridWorld.goalPos,
      gridWorld.grid,
      rewardStructure,
      !isValidMove // collision penalty
    );
    
    // Check if episode is done
    const isDone = positionsEqual(nextPosition, gridWorld.goalPos);
    
    return {
      nextState,
      nextPosition,
      reward,
      isDone,
      collision: !isValidMove
    };
  }, [gridWorld.grid, gridWorld.gridSize, gridWorld.goalPos, rewardStructure]);

  /**
   * Perform Q-value update based on selected algorithm
   */
  const performUpdate = useCallback((state, action, reward, nextState, isDone) => {
    setQTable(prevQTable => {
      const newQTable = { ...prevQTable };
      
      switch (algorithm) {
        case ALGORITHMS.Q_LEARNING:
          updateQTable(
            newQTable,
            state,
            action,
            reward,
            nextState,
            parameters.learningRate,
            parameters.discountFactor,
            isDone,
            'q-learning'
          );
          break;
          
        case ALGORITHMS.SARSA:
          // For SARSA, we need the next action (this would be passed from training loop)
          updateQTable(
            newQTable,
            state,
            action,
            reward,
            nextState,
            parameters.learningRate,
            parameters.discountFactor,
            isDone,
            'sarsa'
          );
          break;
          
        case ALGORITHMS.EXPECTED_SARSA:
          updateQTable(
            newQTable,
            state,
            action,
            reward,
            nextState,
            parameters.learningRate,
            parameters.discountFactor,
            isDone,
            'expected-sarsa',
            { epsilon: parameters.epsilon }
          );
          break;
          
        default:
          console.warn(`Unknown algorithm: ${algorithm}`);
      }
      
      return newQTable;
    });
    
    setTotalSteps(prev => prev + 1);
    performanceRef.current.updateCount++;
  }, [algorithm, parameters]);

  /**
   * Select action based on current exploration strategy
   */
  const selectActionForState = useCallback((state, validActions = Object.values(ACTIONS)) => {
    if (!qTable[state]) {
      // Random action for unvisited states
      return validActions[Math.floor(Math.random() * validActions.length)];
    }

    return selectAction(
      qTable,
      state,
      validActions,
      explorationStrategy,
      {
        epsilon: parameters.epsilon,
        temperature: parameters.temperature || 1.0,
        c: parameters.ucbC || 2.0
      }
    );
  }, [qTable, explorationStrategy, parameters]);

  /**
   * Get Q-values for visualization
   */
  const getQValues = useCallback((state) => {
    return qTable[state] || {};
  }, [qTable]);

  /**
   * Get current policy (greedy action for each state)
   */
  const getCurrentPolicy = useMemo(() => {
    if (!isInitialized || Object.keys(qTable).length === 0) {
      return {};
    }

    return getGreedyPolicy(qTable, Object.values(ACTIONS));
  }, [qTable, isInitialized]);

  /**
   * Get state value function (max Q-value for each state)
   */
  const getStateValues = useMemo(() => {
    const stateValues = {};
    
    Object.keys(qTable).forEach(state => {
      const qValues = qTable[state];
      stateValues[state] = Math.max(...Object.values(qValues));
    });
    
    return stateValues;
  }, [qTable]);

  /**
   * Check for convergence periodically
   */
  const checkForConvergence = useCallback(() => {
    if (performanceRef.current.updateCount - performanceRef.current.lastConvergenceCheck < 100) {
      return; // Check every 100 updates
    }

    const convergenceResult = checkConvergence(
      qTable,
      TRAINING.CONVERGENCE_THRESHOLD,
      TRAINING.CONVERGENCE_WINDOW
    );

    setConvergenceInfo(prev => ({
      ...convergenceResult,
      stableEpisodes: convergenceResult.isConverged ? prev.stableEpisodes + 1 : 0
    }));

    performanceRef.current.lastConvergenceCheck = performanceRef.current.updateCount;
  }, [qTable]);

  /**
   * Reset Q-learning to initial state
   */
  const reset = useCallback(() => {
    setQTable({});
    setIsInitialized(false);
    setTotalSteps(0);
    setConvergenceInfo({
      isConverged: false,
      stableEpisodes: 0,
      convergenceValue: 0
    });
    performanceRef.current = {
      lastQTableHash: null,
      updateCount: 0,
      lastConvergenceCheck: 0
    };
  }, []);

  /**
   * Get training statistics
   */
  const getTrainingStats = useMemo(() => {
    return {
      totalSteps,
      totalStates: Object.keys(qTable).length,
      exploredStates: Object.keys(qTable).filter(state => 
        Object.values(qTable[state]).some(value => value !== 0)
      ).length,
      convergenceInfo,
      parameters,
      algorithm,
      explorationStrategy
    };
  }, [totalSteps, qTable, convergenceInfo, parameters, algorithm, explorationStrategy]);

  /**
   * Export Q-table and configuration
   */
  const exportConfiguration = useCallback(() => {
    return {
      qTable,
      parameters,
      algorithm,
      explorationStrategy,
      rewardStructure,
      trainingStats: getTrainingStats,
      gridConfig: {
        size: gridWorld.gridSize,
        startPos: gridWorld.startPos,
        goalPos: gridWorld.goalPos
      }
    };
  }, [qTable, parameters, algorithm, explorationStrategy, rewardStructure, getTrainingStats, gridWorld]);

  /**
   * Import Q-table and configuration
   */
  const importConfiguration = useCallback((config) => {
    try {
      setQTable(config.qTable || {});
      setParameters(config.parameters || RL_PARAMS);
      setAlgorithm(config.algorithm || ALGORITHMS.Q_LEARNING);
      setExplorationStrategy(config.explorationStrategy || EXPLORATION_STRATEGIES.EPSILON_GREEDY);
      setRewardStructure(config.rewardStructure || REWARDS.DEFAULT);
      setIsInitialized(Object.keys(config.qTable || {}).length > 0);
      
      console.log('Q-learning configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import Q-learning configuration:', error);
      return false;
    }
  }, []);

  // Auto-initialize when grid changes
  useEffect(() => {
    if (gridWorld.grid && gridWorld.startPos && gridWorld.goalPos && !isInitialized) {
      initializeQLearning();
    }
  }, [gridWorld.grid, gridWorld.startPos, gridWorld.goalPos, isInitialized, initializeQLearning]);

  // Periodic convergence checking
  useEffect(() => {
    if (isInitialized && totalSteps > 0) {
      checkForConvergence();
    }
  }, [totalSteps, isInitialized, checkForConvergence]);

  return {
    // State
    qTable,
    isInitialized,
    algorithm,
    explorationStrategy,
    parameters,
    rewardStructure,
    
    // Computed
    currentPolicy: getCurrentPolicy,
    stateValues: getStateValues,
    trainingStats: getTrainingStats,
    
    // Actions
    initializeQLearning,
    executeStep,
    performUpdate,
    selectActionForState,
    updateParameters,
    setAlgorithm,
    setExplorationStrategy,
    setRewardStructure,
    reset,
    
    // Utilities
    getQValues,
    exportConfiguration,
    importConfiguration
  };
};