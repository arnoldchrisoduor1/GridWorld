import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  TRAINING,
  ACTIONS,
} from '../utils/constants.js';
import {
  positionToState,
  stateToPosition,
  getValidActions,
  positionsEqual
} from '../utils/gridUtils.js';

/**
 * Fixed Training loop management hook for RL algorithms
 */
export const useTraining = (gridWorld, qLearning) => {
  // Training State
  const [isTraining, setIsTraining] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxEpisodes, setMaxEpisodes] = useState(TRAINING.MAX_EPISODES || 1000);
  
  // Episode State
  const [episodeReward, setEpisodeReward] = useState(0);
  const [episodeSteps, setEpisodeSteps] = useState(0);
  const [isEpisodeComplete, setIsEpisodeComplete] = useState(false);
  
  // Training Control
  const [trainingSpeed, setTrainingSpeed] = useState(TRAINING.NORMAL || 100);
  const [autoStop, setAutoStop] = useState(true);
  const [visualizeTraining, setVisualizeTraining] = useState(true);
  
  // Performance Tracking
  const [episodeHistory, setEpisodeHistory] = useState([]);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [stepsHistory, setStepsHistory] = useState([]);
  const [explorationHistory, setExplorationHistory] = useState([]);
  
  // Current episode state - FIXED: Use gridWorld as source of truth
  const [episodeTrajectory, setEpisodeTrajectory] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [lastReward, setLastReward] = useState(0);
  
  // Training refs for performance and state management
  const trainingRef = useRef({
    intervalId: null,
    startTime: null,
    pausedTime: 0,
    lastEpsilonUpdate: 0,
    isRunning: false,
    currentEpisodeNumber: 0 // Track episode number separately to avoid stale closures
  });
  
  const performanceRef = useRef({
    episodeTimes: [],
    totalRewards: [],
    convergenceTracking: []
  });

  // Check if training is properly initialized
  const isProperlyInitialized = useCallback(() => {
    const hasGridWorld = gridWorld && gridWorld.startPos && gridWorld.goalPos && gridWorld.grid;
    const hasQLearning = qLearning && qLearning.isInitialized;
    
    if (!hasGridWorld) {
      console.warn('GridWorld not properly initialized:', {
        startPos: gridWorld?.startPos,
        goalPos: gridWorld?.goalPos,
        grid: !!gridWorld?.grid
      });
    }
    
    if (!hasQLearning) {
      console.warn('Q-Learning not initialized:', qLearning?.isInitialized);
    }
    
    return hasGridWorld && hasQLearning;
  }, [gridWorld, qLearning]);

  /**
   * Initialize training session
   */
  const initializeTraining = useCallback(() => {
    console.log("Attempting to initialize training...");
    
    if (!isProperlyInitialized()) {
      console.warn('Cannot initialize training: incomplete setup');
      return false;
    }

    console.log("Training setup is valid, initializing...");

    // Reset training state
    setCurrentEpisode(0);
    setCurrentStep(0);
    setEpisodeReward(0);
    setEpisodeSteps(0);
    setIsEpisodeComplete(false);
    
    // FIXED: Reset agent to start position in gridWorld (single source of truth)
    const startPos = [...gridWorld.startPos];
    gridWorld.moveAgent(startPos); // This updates gridWorld.agentPos
    
    // Initialize trajectory
    const initialState = positionToState(startPos, gridWorld.gridSize);
    setEpisodeTrajectory([{
      position: startPos,
      action: null,
      reward: 0,
      qValues: qLearning.getQValues ? qLearning.getQValues(initialState) : []
    }]);
    
    // Clear history
    setEpisodeHistory([]);
    setRewardHistory([]);
    setStepsHistory([]);
    setExplorationHistory([]);
    
    // Reset performance tracking
    performanceRef.current = {
      episodeTimes: [],
      totalRewards: [],
      convergenceTracking: []
    };
    
    trainingRef.current.startTime = Date.now();
    trainingRef.current.pausedTime = 0;
    trainingRef.current.isRunning = false;
    trainingRef.current.currentEpisodeNumber = 0;
    
    console.log('Training initialized successfully');
    return true;
  }, [gridWorld, qLearning, isProperlyInitialized]);

  /**
   * Execute a single training step
   */
  const executeTrainingStep = useCallback(() => {
    // FIXED: Use gridWorld.agentPos as source of truth
    const agentPosition = gridWorld.agentPos;
    
    if (!agentPosition || isEpisodeComplete) {
      console.log("Cannot execute step: no agent position or episode complete");
      return false;
    }

    try {
      const currentState = positionToState(agentPosition, gridWorld.gridSize);
      const validActions = getValidActions(gridWorld.grid, agentPosition);
      
      if (validActions.length === 0) {
        console.warn("No valid actions available at position:", agentPosition);
        return true; // End episode
      }
      
      // Select action using Q-learning policy
      const selectedAction = qLearning.selectActionForState(currentState, validActions);
      
      // Execute step in environment
      const stepResult = qLearning.executeStep(currentState, selectedAction);
      const { nextState, nextPosition, reward, isDone, collision } = stepResult;
      
      // Update Q-values
      qLearning.performUpdate(currentState, selectedAction, reward, nextState, isDone);
      
      // FIXED: Update agent position in gridWorld (single source of truth)
      gridWorld.moveAgent(nextPosition);
      
      // Update episode tracking
      setLastAction(selectedAction);
      setLastReward(reward);
      setEpisodeReward(prev => prev + reward);
      setEpisodeSteps(prev => prev + 1);
      setCurrentStep(prev => prev + 1);
      
      // Update trajectory
      setEpisodeTrajectory(prev => [...prev, {
        position: [...nextPosition],
        action: selectedAction,
        reward,
        qValues: qLearning.getQValues ? qLearning.getQValues(nextState) : [],
        collision
      }]);
      
      // Check if episode is complete
      const maxSteps = TRAINING.MAX_STEPS_PER_EPISODE || 200;
      if (isDone || episodeSteps >= maxSteps) {
        // FIXED: Pass current episode number and metrics to avoid stale state
        completeCurrentEpisode(isDone, reward, episodeSteps, episodeReward + reward);
        return true; // Episode completed
      }
      
      return false; // Episode continues
      
    } catch (error) {
      console.error("Error in training step:", error);
      return true; // End episode on error
    }
  }, [gridWorld, qLearning, isEpisodeComplete, episodeSteps, episodeReward]);

  /**
   * Complete current episode and start new one - FIXED VERSION
   */
  const completeCurrentEpisode = useCallback((success, finalReward, steps, totalReward) => {
    const episodeNumber = trainingRef.current.currentEpisodeNumber + 1;
    console.log(`Completing episode ${episodeNumber}`);
    
    const episodeData = {
      episode: episodeNumber,
      steps: steps,
      reward: totalReward,
      success,
      epsilon: qLearning.parameters?.epsilon || 0,
      trajectory: [...episodeTrajectory],
      duration: Date.now() - (trainingRef.current.startTime || Date.now())
    };
    
    // FIXED: Update histories immediately with current values
    setEpisodeHistory(prev => [...prev, episodeData]);
    setRewardHistory(prev => [...prev, episodeData.reward]);
    setStepsHistory(prev => [...prev, episodeData.steps]);
    setExplorationHistory(prev => [...prev, episodeData.epsilon]);
    
    // Update performance tracking
    performanceRef.current.episodeTimes.push(episodeData.duration);
    performanceRef.current.totalRewards.push(episodeData.reward);
    
    // Update epsilon (epsilon decay) every 10 episodes
    if (episodeNumber - trainingRef.current.lastEpsilonUpdate >= 10) {
      const currentEpsilon = qLearning.parameters?.epsilon || 0.1;
      const minEpsilon = qLearning.parameters?.minEpsilon || 0.01;
      const epsilonDecay = qLearning.parameters?.epsilonDecay || 0.01;
      
      const newEpsilon = Math.max(minEpsilon, currentEpsilon * (1 - epsilonDecay));
      
      if (qLearning.updateParameters) {
        qLearning.updateParameters({ epsilon: newEpsilon });
      }
      trainingRef.current.lastEpsilonUpdate = episodeNumber;
    }
    
    // FIXED: Update episode numbers immediately
    trainingRef.current.currentEpisodeNumber = episodeNumber;
    setCurrentEpisode(episodeNumber);
    setIsEpisodeComplete(true);
    
    console.log(`Episode completed: ${steps} steps, reward: ${totalReward.toFixed(2)}`);
    
    // FIXED: Check if training should continue using current episode number
    const shouldContinue = episodeNumber < maxEpisodes && 
                          (!autoStop || !qLearning.trainingStats?.convergenceInfo?.isConverged);
    
    if (shouldContinue && trainingRef.current.isRunning) {
      // Start new episode after brief pause
      const delay = Math.max(10, trainingSpeed);
      setTimeout(() => {
        if (trainingRef.current.isRunning) {
          startNewEpisode();
        }
      }, delay);
    } else {
      console.log("Training complete or stopped");
      stopTraining();
    }
  }, [qLearning, episodeTrajectory, maxEpisodes, autoStop, trainingSpeed]);

  /**
   * Start a new episode - FIXED VERSION
   */
  const startNewEpisode = useCallback(() => {
    if (!gridWorld.startPos) {
      console.warn("Cannot start new episode: no start position");
      return;
    }
    
    const nextEpisodeNumber = trainingRef.current.currentEpisodeNumber + 1;
    console.log(`Starting episode ${nextEpisodeNumber}`);
    
    // Reset episode state
    setEpisodeReward(0);
    setEpisodeSteps(0);
    setIsEpisodeComplete(false);
    
    // FIXED: Reset agent position in gridWorld (single source of truth)
    const startPos = [...gridWorld.startPos];
    gridWorld.moveAgent(startPos);
    
    const initialState = positionToState(startPos, gridWorld.gridSize);
    setEpisodeTrajectory([{
      position: startPos,
      action: null,
      reward: 0,
      qValues: qLearning.getQValues ? qLearning.getQValues(initialState) : []
    }]);
    
    setLastAction(null);
    setLastReward(0);
    
    trainingRef.current.startTime = Date.now();
    
    // Continue training loop
    if (trainingRef.current.isRunning) {
      scheduleNextStep();
    }
  }, [gridWorld, qLearning]);

  /**
   * Schedule the next training step
   */
  const scheduleNextStep = useCallback(() => {
    if (!trainingRef.current.isRunning) return;
    
    trainingRef.current.intervalId = setTimeout(() => {
      if (trainingRef.current.isRunning) {
        const episodeCompleted = executeTrainingStep();
        if (!episodeCompleted) {
          scheduleNextStep(); // Continue with next step
        }
        // If episode completed, completeCurrentEpisode will handle continuation
      }
    }, Math.max(1, trainingSpeed));
  }, [executeTrainingStep, trainingSpeed]);

  /**
   * Start training process - FIXED VERSION
   */
  const startTraining = useCallback(() => {
    console.log("Starting training...");
    
    // Stop any existing training first
    if (trainingRef.current.intervalId) {
      clearTimeout(trainingRef.current.intervalId);
      trainingRef.current.intervalId = null;
    }
    
    // Initialize if needed
    const initialized = initializeTraining();
    if (!initialized) {
      console.error('Failed to initialize training');
      return false;
    }

    // Set training state
    setIsTraining(true);
    setIsPaused(false);
    trainingRef.current.isRunning = true;
    
    console.log('Training started successfully');
    
    // Start the training loop
    scheduleNextStep();
    
    return true;
  }, [initializeTraining, scheduleNextStep]);

  /**
   * Pause training
   */
  const pauseTraining = useCallback(() => {
    console.log('Pausing training');
    setIsPaused(true);
    trainingRef.current.isRunning = false;
    
    if (trainingRef.current.intervalId) {
      clearTimeout(trainingRef.current.intervalId);
      trainingRef.current.intervalId = null;
    }
  }, []);

  /**
   * Resume training
   */
  const resumeTraining = useCallback(() => {
    if (!isTraining) {
      console.warn('Cannot resume: training not active');
      return;
    }
    
    console.log('Resuming training');
    setIsPaused(false);
    trainingRef.current.isRunning = true;
    
    scheduleNextStep();
  }, [isTraining, scheduleNextStep]);

  /**
   * Stop training
   */
  const stopTraining = useCallback(() => {
    console.log(`Stopping training after ${trainingRef.current.currentEpisodeNumber} episodes`);
    
    setIsTraining(false);
    setIsPaused(false);
    trainingRef.current.isRunning = false;
    
    if (trainingRef.current.intervalId) {
      clearTimeout(trainingRef.current.intervalId);
      trainingRef.current.intervalId = null;
    }
  }, []);

  /**
   * Reset training completely
   */
  const resetTraining = useCallback(() => {
    console.log('Resetting training');
    stopTraining();
    
    if (qLearning.reset) {
      qLearning.reset();
    }
    
    initializeTraining();
  }, [stopTraining, initializeTraining, qLearning]);

  /**
   * Run single step manually (for debugging/demonstration)
   */
  const stepOnce = useCallback(() => {
    if (isTraining && trainingRef.current.isRunning) {
      console.log("Cannot step manually while training is running");
      return false;
    }
    
    const agentPosition = gridWorld.agentPos;
    if (isEpisodeComplete || !agentPosition) {
      startNewEpisode();
      return true;
    }
    
    return executeTrainingStep();
  }, [isTraining, isEpisodeComplete, gridWorld.agentPos, startNewEpisode, executeTrainingStep]);

  /**
   * Calculate training performance metrics - FIXED
   */
  const getPerformanceMetrics = useMemo(() => {
    if (episodeHistory.length === 0) {
      return {
        averageReward: 0,
        averageSteps: 0,
        successRate: 0,
        convergenceRate: 0,
        episodesPerSecond: 0,
        explorationDecline: 0,
        totalEpisodes: 0
      };
    }
    
    const recentEpisodes = Math.min(100, episodeHistory.length);
    const recent = episodeHistory.slice(-recentEpisodes);
    
    const averageReward = recent.reduce((sum, ep) => sum + ep.reward, 0) / recent.length;
    const averageSteps = recent.reduce((sum, ep) => sum + ep.steps, 0) / recent.length;
    const successRate = recent.filter(ep => ep.success).length / recent.length;
    
    const totalTime = performanceRef.current.episodeTimes.reduce((sum, time) => sum + time, 0) / 1000;
    const episodesPerSecond = totalTime > 0 ? episodeHistory.length / totalTime : 0;
    
    const explorationDecline = explorationHistory.length > 1 ? 
      (explorationHistory[0] - explorationHistory[explorationHistory.length - 1]) / explorationHistory[0] : 0;
    
    return {
      averageReward: averageReward.toFixed(2),
      averageSteps: averageSteps.toFixed(1),
      successRate: (successRate * 100).toFixed(1),
      convergenceRate: qLearning.trainingStats?.convergenceInfo?.convergenceValue?.toFixed(4) || '0.0000',
      episodesPerSecond: episodesPerSecond.toFixed(2),
      explorationDecline: (explorationDecline * 100).toFixed(1),
      totalEpisodes: episodeHistory.length
    };
  }, [episodeHistory, explorationHistory, qLearning.trainingStats]);

  /**
   * Get current training status - FIXED
   */
  const getTrainingStatus = useMemo(() => {
    const currentEpisodeNumber = trainingRef.current.currentEpisodeNumber;
    
    return {
      isTraining,
      isPaused,
      currentEpisode: currentEpisodeNumber,
      currentStep,
      maxEpisodes,
      progress: maxEpisodes > 0 ? (currentEpisodeNumber / maxEpisodes) * 100 : 0,
      isComplete: currentEpisodeNumber >= maxEpisodes || qLearning.trainingStats?.convergenceInfo?.isConverged,
      
      // Current episode info
      episodeReward,
      episodeSteps,
      isEpisodeComplete,
      agentPosition: gridWorld.agentPos, // FIXED: Use gridWorld as source of truth
      lastAction,
      lastReward,
      
      // Visualization
      episodeTrajectory,
      visualizeTraining
    };
  }, [
    isTraining, isPaused, currentStep, maxEpisodes,
    episodeReward, episodeSteps, isEpisodeComplete, gridWorld.agentPos,
    lastAction, lastReward, episodeTrajectory, visualizeTraining,
    qLearning.trainingStats
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trainingRef.current.intervalId) {
        clearTimeout(trainingRef.current.intervalId);
      }
      trainingRef.current.isRunning = false;
    };
  }, []);

  return {
    // Training Control
    startTraining,
    pauseTraining,
    resumeTraining,
    stopTraining,
    resetTraining,
    stepOnce,
    
    // Configuration
    setMaxEpisodes,
    setTrainingSpeed,
    setAutoStop,
    setVisualizeTraining,
    
    // State
    trainingStatus: getTrainingStatus,
    performanceMetrics: getPerformanceMetrics,
    
    // History
    episodeHistory,
    rewardHistory,
    stepsHistory,
    explorationHistory,
    
    // Current Episode - FIXED: Use gridWorld as source of truth
    agentPosition: gridWorld.agentPos,
    episodeTrajectory,
    lastAction,
    lastReward,
    
    // Debug info
    isProperlyInitialized: isProperlyInitialized()
  };
};