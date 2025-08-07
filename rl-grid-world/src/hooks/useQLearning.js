import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ACTIONS,
  ALGORITHMS,
  EXPLORATION_STRATEGIES,
  RL_PARAMS,
  REWARDS,
  TRAINING,
} from "../utils/constants.js";
import {
  initializeQTable,
  updateQTable,
  selectAction,
  getGreedyPolicy,
  calculateReward,
  runEpisode,
  checkConvergence,
} from "../utils/rlAlgorithms.js";
import {
  positionToState,
  stateToPosition,
  getNextPosition,
  isValidPosition,
  isWall,
  positionsEqual,
} from "../utils/gridUtils.js";

/**
 * Safe access to constants with fallbacks
 */
const safeConstants = {
  ACTIONS: ACTIONS || { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 },
  ALGORITHMS: ALGORITHMS || {
    Q_LEARNING: "q-learning",
    SARSA: "sarsa",
    EXPECTED_SARSA: "expected-sarsa",
  },
  EXPLORATION_STRATEGIES: EXPLORATION_STRATEGIES || {
    EPSILON_GREEDY: "epsilon-greedy",
  },
  RL_PARAMS: RL_PARAMS || {
    learningRate: 0.1,
    discountFactor: 0.9,
    epsilon: 0.1,
    epsilonDecay: 0.001,
    minEpsilon: 0.01,
    temperature: 1.0,
    ucbC: 2.0,
  },
  REWARDS: REWARDS || { DEFAULT: { goal: 100, step: -1, wall: -10 } },
  TRAINING: TRAINING || {
    CONVERGENCE_THRESHOLD: 0.001,
    CONVERGENCE_WINDOW: 10,
  },
};

/**
 * Q-Learning algorithm hook with comprehensive training management and safety checks
 */
export const useQLearning = (gridWorld) => {
  // Safely access gridWorld properties with fallbacks
  const safeGridWorld = useMemo(
    () => ({
      grid: gridWorld?.grid || null,
      gridSize: gridWorld?.gridSize || 5,
      startPos: gridWorld?.startPos || null,
      goalPos: gridWorld?.goalPos || null,
      ...gridWorld,
    }),
    [gridWorld]
  );

  // Core Q-Learning State
  const [qTable, setQTable] = useState({});
  const [algorithm, setAlgorithm] = useState(
    safeConstants.ALGORITHMS.Q_LEARNING
  );
  const [explorationStrategy, setExplorationStrategy] = useState(
    safeConstants.EXPLORATION_STRATEGIES.EPSILON_GREEDY
  );

  // RL Parameters with safe defaults
  const [parameters, setParameters] = useState(safeConstants.RL_PARAMS);
  const [rewardStructure, setRewardStructure] = useState(
    safeConstants.REWARDS.DEFAULT
  );

  // Training State
  const [isInitialized, setIsInitialized] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);
  const [convergenceInfo, setConvergenceInfo] = useState({
    isConverged: false,
    stableEpisodes: 0,
    convergenceValue: 0,
  });

  // Performance tracking
  const performanceRef = useRef({
    lastQTableHash: null,
    updateCount: 0,
    lastConvergenceCheck: 0,
  });

  /**
   * Safe utility function calls with error handling
   */
  const safeUtilCall = useCallback((fn, fallback, ...args) => {
    try {
      if (typeof fn === "function") {
        return fn(...args);
      }
      console.warn("Function not available, using fallback");
      return fallback;
    } catch (error) {
      console.error("Utility function error:", error);
      return fallback;
    }
  }, []);

  /**
   * Initialize Q-table for current grid configuration
   */
  const initializeQLearning = useCallback(() => {
    try {
      if (
        !safeGridWorld.grid ||
        !safeGridWorld.startPos ||
        !safeGridWorld.goalPos
      ) {
        console.warn(
          "Cannot initialize Q-learning: incomplete grid configuration",
          {
            hasGrid: !!safeGridWorld.grid,
            hasStartPos: !!safeGridWorld.startPos,
            hasGoalPos: !!safeGridWorld.goalPos,
          }
        );
        return false;
      }

      const newQTable = safeUtilCall(
        initializeQTable,
        {},
        safeGridWorld.gridSize,
        Object.values(safeConstants.ACTIONS)
      );

      if (Object.keys(newQTable).length === 0) {
        console.error("Failed to initialize Q-table");
        return false;
      }

      setQTable(newQTable);
      setIsInitialized(true);
      setTotalSteps(0);
      setConvergenceInfo({
        isConverged: false,
        stableEpisodes: 0,
        convergenceValue: 0,
      });

      console.log(
        `Q-learning initialized: ${safeGridWorld.gridSize}×${safeGridWorld.gridSize} grid, ` +
          `${Object.keys(newQTable).length} states`
      );
      return true;
    } catch (error) {
      console.error("Error initializing Q-learning:", error);
      setIsInitialized(false);
      return false;
    }
  }, [
    safeGridWorld.grid,
    safeGridWorld.gridSize,
    safeGridWorld.startPos,
    safeGridWorld.goalPos,
    safeUtilCall,
  ]);

  /**
   * Update RL parameters with validation
   */
  const updateParameters = useCallback(
    (newParams) => {
      try {
        if (!newParams || typeof newParams !== "object") {
          console.warn("Invalid parameters provided");
          return;
        }

        const validatedParams = {
          ...parameters,
          ...newParams,
          // Ensure parameters stay within valid ranges
          learningRate: Math.max(
            0.001,
            Math.min(1.0, newParams.learningRate ?? parameters.learningRate)
          ),
          discountFactor: Math.max(
            0.0,
            Math.min(1.0, newParams.discountFactor ?? parameters.discountFactor)
          ),
          epsilon: Math.max(
            0.0,
            Math.min(1.0, newParams.epsilon ?? parameters.epsilon)
          ),
          epsilonDecay: Math.max(
            0.001,
            Math.min(0.1, newParams.epsilonDecay ?? parameters.epsilonDecay)
          ),
          minEpsilon: Math.max(
            0.0,
            Math.min(0.5, newParams.minEpsilon ?? parameters.minEpsilon)
          ),
          temperature: Math.max(
            0.1,
            newParams.temperature ?? parameters.temperature ?? 1.0
          ),
          ucbC: Math.max(0.1, newParams.ucbC ?? parameters.ucbC ?? 2.0),
        };

        setParameters(validatedParams);
      } catch (error) {
        console.error("Error updating parameters:", error);
      }
    },
    [parameters]
  );

  /**
   * Execute a single step in the environment
   */
  const executeStep = useCallback(
    (currentState, action) => {
      try {
        if (currentState == null || action == null) {
          console.warn("Invalid state or action provided to executeStep");
          return {
            nextState: currentState,
            nextPosition: [0, 0],
            reward: 0,
            isDone: false,
            collision: true,
          };
        }

        const currentPos = safeUtilCall(
          stateToPosition,
          [0, 0],
          currentState,
          safeGridWorld.gridSize
        );

        const nextPos = safeUtilCall(
          getNextPosition,
          currentPos,
          currentPos,
          action
        );

        // Check if move is valid
        const isValidMove =
          safeUtilCall(
            isValidPosition,
            false,
            nextPos,
            safeGridWorld.gridSize
          ) &&
          !safeUtilCall(
            isWall,
            false,
            safeGridWorld.grid,
            nextPos[0],
            nextPos[1]
          );

        const nextPosition = isValidMove ? nextPos : currentPos;
        const nextState = safeUtilCall(
          positionToState,
          currentState,
          nextPosition,
          safeGridWorld.gridSize
        );

        // Calculate reward
        const reward = safeUtilCall(
          calculateReward,
          0,
          currentPos,
          nextPosition,
          safeGridWorld.goalPos,
          safeGridWorld.grid,
          rewardStructure,
          !isValidMove // collision penalty
        );

        // Check if episode is done
        const isDone = safeUtilCall(
          positionsEqual,
          false,
          nextPosition,
          safeGridWorld.goalPos
        );

        return {
          nextState,
          nextPosition,
          reward,
          isDone,
          collision: !isValidMove,
        };
      } catch (error) {
        console.error("Error in executeStep:", error);
        return {
          nextState: currentState,
          nextPosition: [0, 0],
          reward: 0,
          isDone: false,
          collision: true,
        };
      }
    },
    [
      safeGridWorld.grid,
      safeGridWorld.gridSize,
      safeGridWorld.goalPos,
      rewardStructure,
      safeUtilCall,
    ]
  );

  /**
   * Perform Q-value update based on selected algorithm
   */
  const performUpdate = useCallback(
    (state, action, reward, nextState, isDone) => {
      try {
        if (state == null || action == null) {
          console.warn("Invalid parameters for performUpdate");
          return;
        }

        setQTable((prevQTable) => {
          const newQTable = { ...prevQTable };

          // Ensure state exists in Q-table
          if (!newQTable[state]) {
            newQTable[state] = {};
            Object.values(safeConstants.ACTIONS).forEach((a) => {
              newQTable[state][a] = 0;
            });
          }

          try {
            switch (algorithm) {
              case safeConstants.ALGORITHMS.Q_LEARNING:
                safeUtilCall(
                  updateQTable,
                  null,
                  newQTable,
                  state,
                  action,
                  reward || 0,
                  nextState,
                  Object.values(safeConstants.ACTIONS), // validNextActions
                  { ...parameters, algorithm: "q-learning" } // params
                );
                break;

              case safeConstants.ALGORITHMS.SARSA:
                safeUtilCall(
                  updateQTable,
                  null,
                  newQTable,
                  state,
                  action,
                  reward || 0,
                  nextState,
                  Object.values(safeConstants.ACTIONS),
                  { ...parameters, algorithm: "expected-sarsa" }
                );
                break;

              case safeConstants.ALGORITHMS.EXPECTED_SARSA:
                safeUtilCall(
                  updateQTable,
                  null,
                  newQTable,
                  state,
                  action,
                  reward || 0,
                  nextState,
                  parameters.learningRate,
                  parameters.discountFactor,
                  isDone,
                  { ...parameters, algorithm: "expected-sarsa" },
                  { epsilon: parameters.epsilon }
                );
                break;

              default:
                console.warn(`Unknown algorithm: ${algorithm}`);
            }
          } catch (updateError) {
            console.error("Error updating Q-table:", updateError);
          }

          return newQTable;
        });

        setTotalSteps((prev) => prev + 1);
        performanceRef.current.updateCount++;
      } catch (error) {
        console.error("Error in performUpdate:", error);
      }
    },
    [algorithm, parameters, safeUtilCall]
  );

  /**
   * Select action based on current exploration strategy
   */
  const selectActionForState = useCallback(
    (state, validActions = Object.values(safeConstants.ACTIONS)) => {
      try {
        if (state == null) {
          console.warn("Invalid state provided to selectActionForState");
          return validActions[0] || safeConstants.ACTIONS.UP;
        }

        if (!qTable[state] || Object.keys(qTable[state]).length === 0) {
          // Random action for unvisited states
          return validActions[Math.floor(Math.random() * validActions.length)];
        }

        return safeUtilCall(
          selectAction,
          validActions[Math.floor(Math.random() * validActions.length)],
          qTable,
          state,
          validActions,
          explorationStrategy,
          {
            epsilon: parameters.epsilon,
            temperature: parameters.temperature || 1.0,
            c: parameters.ucbC || 2.0,
          }
        );
      } catch (error) {
        console.error("Error in selectActionForState:", error);
        return Object.values(safeConstants.ACTIONS)[0];
      }
    },
    [qTable, explorationStrategy, parameters, safeUtilCall]
  );

  /**
   * Get Q-values for visualization
   */
  const getQValues = useCallback(
    (state) => {
      try {
        return qTable[state] || {};
      } catch (error) {
        console.error("Error getting Q-values:", error);
        return {};
      }
    },
    [qTable]
  );

  /**
   * Get current policy (greedy action for each state)
   */
  const getCurrentPolicy = useMemo(() => {
    try {
      if (!isInitialized || !qTable || qTable.length === 0) {
        return [];
      }

      return safeUtilCall(getGreedyPolicy, [], qTable, safeGridWorld.gridSize);
    } catch (error) {
      console.error("Error getting current policy:", error);
      return [];
    }
  }, [qTable, isInitialized, safeGridWorld.gridSize, safeUtilCall]);

  /**
   * Get state value function (max Q-value for each state)
   */
  const getStateValues = useMemo(() => {
    try {
      const stateValues = {};

      Object.keys(qTable).forEach((state) => {
        const qValues = qTable[state];
        if (qValues && typeof qValues === "object") {
          const values = Object.values(qValues).filter(
            (v) => typeof v === "number"
          );
          stateValues[state] = values.length > 0 ? Math.max(...values) : 0;
        } else {
          stateValues[state] = 0;
        }
      });

      return stateValues;
    } catch (error) {
      console.error("Error computing state values:", error);
      return {};
    }
  }, [qTable]);

  /**
   * Checkn for convergence periodically
   */
  const checkForConvergence = useCallback(() => {
    try {
      if (
        performanceRef.current.updateCount -
          performanceRef.current.lastConvergenceCheck <
        100
      ) {
        return; // wee need to check every 100 runs.
      }

      const convergenceResult = safeUtilCall(
        checkConvergence,
        { isConverged: false, convergenceValue: 0 },
        qTable,
        safeConstants.TRAINING.CONVERGENCE_THRESHOLD,
        safeConstants.TRAINING.CONVERGENCE_WINDOW
      );

      setConvergenceInfo((prev) => ({
        ...convergenceResult,
        stableEpisodes: convergenceResult.isConverged
          ? prev.stableEpisodes + 1
          : 0,
      }));

      performanceRef.current.lastConvergenceCheck =
        performanceRef.current.updateCount;
    } catch (error) {
      console.error("Error checking convergence:", error);
    }
  }, [qTable, safeUtilCall]);

  /**
   * Reset Q-learning to initial state
   */
  const reset = useCallback(() => {
    try {
      setQTable({});
      setIsInitialized(false);
      setTotalSteps(0);
      setConvergenceInfo({
        isConverged: false,
        stableEpisodes: 0,
        convergenceValue: 0,
      });
      performanceRef.current = {
        lastQTableHash: null,
        updateCount: 0,
        lastConvergenceCheck: 0,
      };
    } catch (error) {
      console.error("Error resetting Q-learning:", error);
    }
  }, []);

  /**
   * Get training statistics
   */
  const getTrainingStats = useMemo(() => {
    try {
      return {
        totalSteps,
        totalStates: Object.keys(qTable).length,
        exploredStates: Object.keys(qTable).filter((state) => {
          const stateValues = qTable[state];
          return (
            stateValues &&
            Object.values(stateValues).some(
              (value) => typeof value === "number" && value !== 0
            )
          );
        }).length,
        convergenceInfo,
        parameters,
        algorithm,
        explorationStrategy,
      };
    } catch (error) {
      console.error("Error getting training stats:", error);
      return {
        totalSteps: 0,
        totalStates: 0,
        exploredStates: 0,
        convergenceInfo: {
          isConverged: false,
          stableEpisodes: 0,
          convergenceValue: 0,
        },
        parameters: safeConstants.RL_PARAMS,
        algorithm: safeConstants.ALGORITHMS.Q_LEARNING,
        explorationStrategy:
          safeConstants.EXPLORATION_STRATEGIES.EPSILON_GREEDY,
      };
    }
  }, [
    totalSteps,
    qTable,
    convergenceInfo,
    parameters,
    algorithm,
    explorationStrategy,
  ]);

  /**
   * Export Q-table and configuration
   */
  const exportConfiguration = useCallback(() => {
    try {
      return {
        qTable,
        parameters,
        algorithm,
        explorationStrategy,
        rewardStructure,
        trainingStats: getTrainingStats,
        gridConfig: {
          size: safeGridWorld.gridSize,
          startPos: safeGridWorld.startPos,
          goalPos: safeGridWorld.goalPos,
        },
      };
    } catch (error) {
      console.error("Error exporting configuration:", error);
      return {
        qTable: {},
        parameters: safeConstants.RL_PARAMS,
        algorithm: safeConstants.ALGORITHMS.Q_LEARNING,
        explorationStrategy:
          safeConstants.EXPLORATION_STRATEGIES.EPSILON_GREEDY,
        rewardStructure: safeConstants.REWARDS.DEFAULT,
        trainingStats: getTrainingStats,
        gridConfig: { size: 5, startPos: null, goalPos: null },
      };
    }
  }, [
    qTable,
    parameters,
    algorithm,
    explorationStrategy,
    rewardStructure,
    getTrainingStats,
    safeGridWorld,
  ]);

  /**
   * Import Q-table and configuration
   */
  const importConfiguration = useCallback((config) => {
    try {
      if (!config || typeof config !== "object") {
        console.error("Invalid configuration provided");
        return false;
      }

      setQTable(config.qTable || {});
      setParameters(config.parameters || safeConstants.RL_PARAMS);
      setAlgorithm(config.algorithm || safeConstants.ALGORITHMS.Q_LEARNING);
      setExplorationStrategy(
        config.explorationStrategy ||
          safeConstants.EXPLORATION_STRATEGIES.EPSILON_GREEDY
      );
      setRewardStructure(
        config.rewardStructure || safeConstants.REWARDS.DEFAULT
      );
      setIsInitialized(Object.keys(config.qTable || {}).length > 0);

      console.log("Q-learning configuration imported successfully");
      return true;
    } catch (error) {
      console.error("Failed to import Q-learning configuration:", error);
      return false;
    }
  }, []);

  // Auto-initialize when grid changes
  useEffect(() => {
    try {
      if (
        safeGridWorld.grid &&
        safeGridWorld.startPos &&
        safeGridWorld.goalPos &&
        !isInitialized
      ) {
        const success = initializeQLearning();
        if (!success) {
          console.warn("Auto-initialization failed");
        }
      }
    } catch (error) {
      console.error("Error in auto-initialization effect:", error);
    }
  }, [
    safeGridWorld.grid,
    safeGridWorld.startPos,
    safeGridWorld.goalPos,
    isInitialized,
    initializeQLearning,
  ]);

  // Periodic convergence checking
  useEffect(() => {
    try {
      if (isInitialized && totalSteps > 0) {
        checkForConvergence();
      }
    } catch (error) {
      console.error("Error in convergence checking effect:", error);
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
    setAlgorithm: (alg) => {
      if (Object.values(safeConstants.ALGORITHMS).includes(alg)) {
        setAlgorithm(alg);
      } else {
        console.warn(`Invalid algorithm: ${alg}`);
      }
    },
    setExplorationStrategy: (strategy) => {
      if (
        Object.values(safeConstants.EXPLORATION_STRATEGIES).includes(strategy)
      ) {
        setExplorationStrategy(strategy);
      } else {
        console.warn(`Invalid exploration strategy: ${strategy}`);
      }
    },
    setRewardStructure,
    reset,

    // Utilities
    getQValues,
    exportConfiguration,
    importConfiguration,
  };
};
