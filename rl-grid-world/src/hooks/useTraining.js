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
 * Training loop management hook for RL algorithms
 */
export const useTraining = (gridWorld, qLearning) => {
  // Training State
  const [isTraining, setIsTraining] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxEpisodes, setMaxEpisodes] = useState(TRAINING.MAX_EPISODES);
  
  // Episode State
  const [episodeReward, setEpisodeReward] = useState(0);
  const [episodeSteps, setEpisodeSteps] = useState(0);
  const [isEpisodeComplete, setIsEpisodeComplete] = useState(false);
  
  // Training Control
  const [trainingSpeed, setTrainingSpeed] = useState(TRAINING.NORMAL);
  const [autoStop, setAutoStop] = useState(true);
  const [visualizeTraining, setVisualizeTraining] = useState(true);
  
  // Performance Tracking
  const [episodeHistory, setEpisodeHistory] = useState([]);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [stepsHistory, setStepsHistory] = useState([]);
  const [explorationHistory, setExplorationHistory] = useState([]);
  
  // Current episode state
  const [agentPosition, setAgentPosition] = useState(null);
  const [episodeTrajectory, setEpisodeTrajectory] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [lastReward, setLastReward] = useState(0);
  
  // Training refs for performance
  const trainingRef = useRef({
    intervalId: null,
    startTime: null,
    pausedTime: 0,
    lastEpsilonUpdate: 0
  });
  
  const performanceRef = useRef({
    episodeTimes: [],
    totalRewards: [],
    convergenceTracking: []
  });

  /**
   * Initialize training session
   */
  const initializeTraining = useCallback(() => {
    if (!gridWorld.startPos || !gridWorld.goalPos || !qLearning.isInitialized) {
      console.warn('Cannot initialize training: incomplete setup');
      return false;
    }

    // Reset training state
    setCurrentEpisode(0);
    setCurrentStep(0);
    setEpisodeReward(0);
    setEpisodeSteps(0);
    setIsEpisodeComplete(false);
    
    // Reset agent to start position
    setAgentPosition([...gridWorld.startPos]);
    setEpisodeTrajectory([{
      position: [...gridWorld.startPos],
      action: null,
      reward: 0,
      qValues: qLearning.getQValues(positionToState(gridWorld.startPos, gridWorld.gridSize))
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
    
    console.log('Training initialized');
    return true;
  }, [gridWorld.startPos, gridWorld.goalPos, qLearning.isInitialized, qLearning, gridWorld.gridSize]);

  /**
   * Execute a single training step
   */
  const executeTrainingStep = useCallback(() => {
    if (!agentPosition || isEpisodeComplete) return false;

    const currentState = positionToState(agentPosition, gridWorld.gridSize);
    const validActions = getValidActions(agentPosition, gridWorld.grid);
    
    // Select action using current policy
    const selectedAction = qLearning.selectActionForState(currentState, validActions);
    
    // Execute step in environment
    const stepResult = qLearning.executeStep(currentState, selectedAction);
    const { nextState, nextPosition, reward, isDone, collision } = stepResult;
    
    // Update Q-values
    qLearning.performUpdate(currentState, selectedAction, reward, nextState, isDone);
    
    // Update episode state
    setAgentPosition(nextPosition);
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
      qValues: qLearning.getQValues(nextState),
      collision
    }]);
    
    // Check if episode is complete
    if (isDone || episodeSteps >= TRAINING.MAX_STEPS_PER_EPISODE) {
      completeEpisode(isDone, reward);
      return true; // Episode completed
    }
    
    return false; // Episode continues
  }, [agentPosition, isEpisodeComplete, gridWorld.gridSize, gridWorld.grid, qLearning, episodeSteps]);

  /**
   * Complete current episode and start new one
   */
  const completeEpisode = useCallback((success, finalReward) => {
    const episodeData = {
      episode: currentEpisode + 1,
      steps: episodeSteps,
      reward: episodeReward + finalReward,
      success,
      epsilon: qLearning.parameters.epsilon,
      trajectory: [...episodeTrajectory],
      duration: Date.now() - (trainingRef.current.startTime || Date.now())
    };
    
    // Update histories
    setEpisodeHistory(prev => [...prev, episodeData]);
    setRewardHistory(prev => [...prev, episodeData.reward]);
    setStepsHistory(prev => [...prev, episodeData.steps]);
    setExplorationHistory(prev => [...prev, episodeData.epsilon]);
    
    // Update performance tracking
    performanceRef.current.episodeTimes.push(episodeData.duration);
    performanceRef.current.totalRewards.push(episodeData.reward);
    
    // Update epsilon (epsilon decay)
    if (currentEpisode - trainingRef.current.lastEpsilonUpdate >= 10) {
      const newEpsilon = Math.max(
        qLearning.parameters.minEpsilon,
        qLearning.parameters.epsilon * (1 - qLearning.parameters.epsilonDecay)
      );
      qLearning.updateParameters({ epsilon: newEpsilon });
      trainingRef.current.lastEpsilonUpdate = currentEpisode;
    }
    
    setCurrentEpisode(prev => prev + 1);
    setIsEpisodeComplete(true);
    
    // Check if training should continue
    const shouldContinue = (currentEpisode + 1) < maxEpisodes && 
                          (!autoStop || !qLearning.trainingStats.convergenceInfo.isConverged);
    
    if (shouldContinue && isTraining && !isPaused) {
      // Start new episode after brief pause
      setTimeout(startNewEpisode, trainingSpeed);
    } else {
      stopTraining();
    }
    
    console.log(`Episode ${currentEpisode + 1} completed: ${episodeData.steps} steps, reward: ${episodeData.reward.toFixed(2)}`);
  }, [currentEpisode, episodeSteps, episodeReward, episodeTrajectory, qLearning, maxEpisodes, autoStop, isTraining, isPaused, trainingSpeed]);

  /**
   * Start a new episode
   */
  const startNewEpisode = useCallback(() => {
    if (!gridWorld.startPos) return;
    
    // Reset episode state
    setEpisodeReward(0);
    setEpisodeSteps(0);
    setIsEpisodeComplete(false);
    setAgentPosition([...gridWorld.startPos]);
    setEpisodeTrajectory([{
      position: [...gridWorld.startPos],
      action: null,
      reward: 0,
      qValues: qLearning.getQValues(positionToState(gridWorld.startPos, gridWorld.gridSize))
    }]);
    setLastAction(null);
    setLastReward(0);
    
    trainingRef.current.startTime = Date.now();
  }, [gridWorld.startPos, qLearning, gridWorld.gridSize]);

  /**
   * Start training process
   */
  const startTraining = useCallback(() => {
    if (!qLearning.isInitialized) {
      console.warn('Cannot start training: Q-learning not initialized');
      return false;
    }

    if (!isTraining) {
      if (!initializeTraining()) return false;
    }
    
    setIsTraining(true);
    setIsPaused(false);
    
    // Start training loop
    const runTrainingLoop = () => {
      if (!isTraining || isPaused) return;
      
      const episodeCompleted = executeTrainingStep();
      
      if (!episodeCompleted && isTraining && !isPaused) {
        trainingRef.current.intervalId = setTimeout(runTrainingLoop, trainingSpeed);
      }
    };
    
    runTrainingLoop();
    console.log('Training started');
    return true;
  }, [qLearning.isInitialized, isTraining, initializeTraining, isPaused, executeTrainingStep, trainingSpeed]);

  /**
   * Pause training
   */
  const pauseTraining = useCallback(() => {
    setIsPaused(true);
    if (trainingRef.current.intervalId) {
      clearTimeout(trainingRef.current.intervalId);
      trainingRef.current.intervalId = null;
    }
    console.log('Training paused');
  }, []);

  /**
   * Resume training
   */
  const resumeTraining = useCallback(() => {
    if (!isTraining) return;
    
    setIsPaused(false);
    
    const runTrainingLoop = () => {
      if (!isTraining || isPaused) return;
      
      const episodeCompleted = executeTrainingStep();
      
      if (!episodeCompleted && isTraining && !isPaused) {
        trainingRef.current.intervalId = setTimeout(runTrainingLoop, trainingSpeed);
      }
    };
    
    runTrainingLoop();
    console.log('Training resumed');
  }, [isTraining, isPaused, executeTrainingStep, trainingSpeed]);

  /**
   * Stop training
   */
  const stopTraining = useCallback(() => {
    setIsTraining(false);
    setIsPaused(false);
    
    if (trainingRef.current.intervalId) {
      clearTimeout(trainingRef.current.intervalId);
      trainingRef.current.intervalId = null;
    }
    
    console.log(`Training stopped after ${currentEpisode} episodes`);
  }, [currentEpisode]);

  /**
   * Reset training completely
   */
  const resetTraining = useCallback(() => {
    stopTraining();
    initializeTraining();
    qLearning.reset();
    console.log('Training reset');
  }, [stopTraining, initializeTraining, qLearning]);

  /**
   * Run single step manually (for debugging/demonstration)
   */
  const stepOnce = useCallback(() => {
    if (isTraining) return false;
    
    if (isEpisodeComplete || !agentPosition) {
      startNewEpisode();
      return true;
    }
    
    return executeTrainingStep();
  }, [isTraining, isEpisodeComplete, agentPosition, startNewEpisode, executeTrainingStep]);

  /**
   * Calculate training performance metrics
   */
  const getPerformanceMetrics = useMemo(() => {
    if (episodeHistory.length === 0) {
      return {
        averageReward: 0,
        averageSteps: 0,
        successRate: 0,
        convergenceRate: 0,
        episodesPerSecond: 0,
        explorationDecline: 0
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
      convergenceRate: qLearning.trainingStats.convergenceInfo.convergenceValue.toFixed(4),
      episodesPerSecond: episodesPerSecond.toFixed(2),
      explorationDecline: (explorationDecline * 100).toFixed(1)
    };
  }, [episodeHistory, explorationHistory, qLearning.trainingStats.convergenceInfo]);

  /**
   * Get current training status
   */
  const getTrainingStatus = useMemo(() => {
    return {
      isTraining,
      isPaused,
      currentEpisode,
      currentStep,
      maxEpisodes,
      progress: maxEpisodes > 0 ? (currentEpisode / maxEpisodes) * 100 : 0,
      isComplete: currentEpisode >= maxEpisodes || qLearning.trainingStats.convergenceInfo.isConverged,
      
      // Current episode info
      episodeReward,
      episodeSteps,
      isEpisodeComplete,
      agentPosition,
      lastAction,
      lastReward,
      
      // Visualization
      episodeTrajectory,
      visualizeTraining
    };
  }, [
    isTraining, isPaused, currentEpisode, currentStep, maxEpisodes,
    episodeReward, episodeSteps, isEpisodeComplete, agentPosition,
    lastAction, lastReward, episodeTrajectory, visualizeTraining,
    qLearning.trainingStats.convergenceInfo
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trainingRef.current.intervalId) {
        clearTimeout(trainingRef.current.intervalId);
      }
    };
  }, []);

  // Auto-pause when window loses focus (optional performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTraining && !isPaused) {
        pauseTraining();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTraining, isPaused, pauseTraining]);

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
    
    // Current Episode
    agentPosition,
    episodeTrajectory,
    lastAction,
    lastReward
  };
};