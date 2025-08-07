import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings,
  Target,
  Zap,
  BarChart3,
  Grid3x3,
  ChevronDown,
  ChevronUp,
  Info,
  Flag,
  Pin,
} from 'lucide-react';
import { TRAINING, ALGORITHMS, EXPLORATION_STRATEGIES, CELL_TYPES } from '../utils/constants';

/**
 * Main control panel for training management and quick actions
 */
const ControlPanel = ({ 
  training, 
  qLearning, 
  gridWorld,
  onShowMetrics,
  onShowParameters,
  onShowVisualization 
}) => {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);

   const { isEditing, setIsEditing, editMode, setEditMode, randomizePositions } = gridWorld;
  const { isTraining, isPaused } = training;


  // Early return if training is not available
  if (!training) {
    return <div className="p-4 text-red-600">Training system not available.</div>;
  }

  // Safe access to training properties with defaults
  const trainingStatus = training.trainingStatus || {
    isTraining: false,
    isPaused: false,
    isComplete: false,
    currentEpisode: 0,
    maxEpisodes: 1000,
    progress: 0,
    episodeReward: 0,
    episodeSteps: 0,
    agentPosition: null,
    speed: TRAINING?.ANIMATION_SPEEDS?.NORMAL || 100
  };

  // Safe access to training methods with fallbacks
  const {
    startTraining = () => console.warn('startTraining not available'),
    pauseTraining = () => console.warn('pauseTraining not available'),
    resumeTraining = () => console.warn('resumeTraining not available'),
    stopTraining = () => console.warn('stopTraining not available'),
    resetTraining = () => console.warn('resetTraining not available'),
    stepOnce = () => console.warn('stepOnce not available'),
    setTrainingSpeed = () => console.warn('setTrainingSpeed not available'),
    setMaxEpisodes = () => console.warn('setMaxEpisodes not available'),
    setAutoStop = () => console.warn('setAutoStop not available'),
    setVisualizeTraining = () => console.warn('setVisualizeTraining not available'),
    autoStop = false,
    visualizeTraining = true
  } = training || {};

  // Safe access to qLearning properties
  const safeQLearning = {
    isInitialized: qLearning?.isInitialized || false,
    algorithm: qLearning?.algorithm || 'Q-Learning',
    explorationStrategy: qLearning?.explorationStrategy || 'Epsilon-Greedy',
    initializeQLearning: qLearning?.initializeQLearning || (() => console.warn('initializeQLearning not available')),
    parameters: {
      epsilon: qLearning?.parameters?.epsilon || 0.1,
      ...qLearning?.parameters
    },
    trainingStats: {
      totalSteps: qLearning?.trainingStats?.totalSteps || 0,
      exploredStates: qLearning?.trainingStats?.exploredStates || 0,
      totalStates: qLearning?.trainingStats?.totalStates || 0,
      convergenceInfo: {
        isConverged: qLearning?.trainingStats?.convergenceInfo?.isConverged || false,
        ...qLearning?.trainingStats?.convergenceInfo
      },
      ...qLearning?.trainingStats
    },
    ...qLearning
  };

  // Safe access to gridWorld properties
  const safeGridWorld = {
    startPos: gridWorld?.startPos || null,
    ...gridWorld
  };
  
  /**
   * Handle training control actions
   */
  const handleTrainingAction = (action) => {
    try {
      switch (action) {
        case 'start':
          if (!safeQLearning.isInitialized) {
            safeQLearning.initializeQLearning();
          }
          startTraining();
          break;
        case 'pause':
          pauseTraining();
          break;
        case 'resume':
          resumeTraining();
          break;
        case 'stop':
          stopTraining();
          break;
        case 'reset':
          resetTraining();
          break;
        case 'step':
          stepOnce();
          break;
        default:
          console.warn(`Unknown training action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing training action ${action}:`, error);
    }
  };

  const handleEditMode = (mode) => {
    if(editMode == mode) {
      // we will toggle off if already in edit mode
      setIsEditing(false);
      setEditMode(null);
    } else {
      setIsEditing(true);
      setEditMode(mode);
    }
  }

  const handleRandomize = () => {
    // A simple action that doesn't require editing mode
    randomizePositions();
    // Ensure editing mode is off after randomization
    setIsEditing(false);
    setEditMode(null);
  };

  /**
   * Get appropriate training button
   */
  const getTrainingButton = () => {
    if (!trainingStatus.isTraining) {
      return {
        action: 'start',
        icon: Play,
        text: 'Start Training',
        className: 'bg-green-600 hover:bg-green-700 text-white',
        disabled: !safeQLearning.isInitialized && !safeGridWorld.startPos
      };
    } else if (trainingStatus.isPaused) {
      return {
        action: 'resume',
        icon: Play,
        text: 'Resume',
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        disabled: false
      };
    } else {
      return {
        action: 'pause',
        icon: Pause,
        text: 'Pause',
        className: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        disabled: false
      };
    }
  };

  const trainingButton = getTrainingButton();

  /**
   * Format training progress
   */
  const formatProgress = () => {
    const { currentEpisode = 0, maxEpisodes = 1000, progress = 0 } = trainingStatus;
    return `${currentEpisode}/${maxEpisodes} (${progress.toFixed(1)}%)`;
  };

  /**
   * Get status indicator color
   */
  const getStatusColor = () => {
    if (trainingStatus.isComplete) return 'text-green-600';
    if (trainingStatus.isTraining && !trainingStatus.isPaused) return 'text-blue-600';
    if (trainingStatus.isPaused) return 'text-yellow-600';
    return 'text-gray-600';
  };

  /**
   * Safe handler for callback functions
   */
  const safeCallHandler = (handler, defaultAction = () => {}) => {
    return typeof handler === 'function' ? handler : defaultAction;
  };

  /**
   * Tooltip component
   */
  const Tooltip = ({ children, content, id }) => (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(id)}
      onMouseLeave={() => setShowTooltip(null)}
    >
      {children}
      {showTooltip === id && content && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );

  // Safe access to TRAINING constants
  const animationSpeeds = TRAINING?.ANIMATION_SPEEDS || {
    SLOW: 1000,
    NORMAL: 100,
    FAST: 10,
    VERY_FAST: 1
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Training Control</h2>
              <p className="text-blue-100 text-sm">
                Algorithm: {safeQLearning.algorithm} | Strategy: {safeQLearning.explorationStrategy}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick Status */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
              <span className="font-medium">
                {trainingStatus.isComplete ? 'Complete' :
                 trainingStatus.isTraining ? (trainingStatus.isPaused ? 'Paused' : 'Training') : 'Ready'}
              </span>
            </div>
            {trainingStatus.isTraining && (
              <div className="text-sm text-gray-600">
                Episode {formatProgress()}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {safeQLearning.trainingStats.convergenceInfo.isConverged && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                Converged
              </span>
            )}
            {trainingStatus.episodeReward !== 0 && (
              <span className="text-sm text-gray-600">
                Reward: {(trainingStatus.episodeReward || 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {trainingStatus.isTraining && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{(trainingStatus.progress || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, trainingStatus.progress || 0)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className="p-4">
        <div className="flex gap-3 mb-4">
          {/* Primary Training button */}
          <Tooltip content={trainingButton.text} id="training-btn">
            <button
              onClick={() => handleTrainingAction(trainingButton.action)}
              disabled={trainingButton.disabled}
              className={`control-button flex-1 ${trainingButton.className} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <trainingButton.icon className="w-4 h-4" />
              {trainingButton.text}
            </button>
          </Tooltip>

          {/* Stop button */}
          {trainingStatus.isTraining && (
            <Tooltip content="Stop training" id="stop-btn">
              <button
                onClick={() => handleTrainingAction('stop')}
                className="control-button bg-red-600 hover:bg-red-700 text-white"
              >
                <Square className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {/* Step button */}
          {!trainingStatus.isTraining && (
            <Tooltip content="Execute single step" id="step-btn">
              <button
                onClick={() => handleTrainingAction('step')}
                disabled={!safeQLearning.isInitialized}
                className="control-button bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {/* Reset button */}
          <Tooltip content="Reset training" id="reset-btn">
            <button
              onClick={() => handleTrainingAction('reset')}
              className="control-button bg-gray-600 hover:bg-gray-700 text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <div className="flex flex-wrap gap-2">
        <button
          onClick={handleRandomize}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw size={16} /> Randomize Grid
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* button to set START position */}
        <button
          onClick={() => handleEditMode(CELL_TYPES.START)}
          variant={editMode === CELL_TYPES.START ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <Flag size={16} /> Set Start
        </button>

        {/* button to set GOAL position */}
        <button
          onClick={() => handleEditMode(CELL_TYPES.GOAL)}
          variant={editMode === CELL_TYPES.GOAL ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <Pin size={16} /> Set Goal
        </button>

        {/* button to set WALLS */}
        <button
          onClick={() => handleEditMode(CELL_TYPES.WALL)}
          variant={editMode === CELL_TYPES.WALL ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <Settings size={16} /> Edit Walls
        </button>
      </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Tooltip content="Training parameters" id="params-btn">
            <button
              onClick={safeCallHandler(onShowParameters)}
              className="control-button bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
            >
              <Settings className="w-4 h-4" />
              Parameters
            </button>
          </Tooltip>

          <Tooltip content="Performance metrics" id="metrics-btn">
            <button
              onClick={safeCallHandler(onShowMetrics)}
              className="control-button bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              Metrics
            </button>
          </Tooltip>

          <Tooltip content="Visualizations" id="viz-btn">
            <button
              onClick={safeCallHandler(onShowVisualization)}
              className="control-button bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
            >
              <Grid3x3 className="w-4 h-4" />
              Visualize
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Training Stats */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Training Stats
              </h4>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>Total Steps:</span>
                  <span className="font-medium">{safeQLearning.trainingStats.totalSteps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Explored States:</span>
                  <span className="font-medium">
                    {safeQLearning.trainingStats.exploredStates}/{safeQLearning.trainingStats.totalStates}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current ε:</span>
                  <span className="font-medium">{(safeQLearning.parameters.epsilon || 0).toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Episode Stats */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Current Episode</h4>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>Steps:</span>
                  <span className="font-medium">{trainingStatus.episodeSteps || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reward:</span>
                  <span className="font-medium">{(trainingStatus.episodeReward || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Position:</span>
                  <span className="font-medium">
                    {trainingStatus.agentPosition && Array.isArray(trainingStatus.agentPosition) ? 
                      `(${trainingStatus.agentPosition[0]}, ${trainingStatus.agentPosition[1]})` : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-gray-700 mb-3">Quick Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Training Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Training Speed
                </label>
                <select
                  value={trainingStatus.speed || animationSpeeds.NORMAL}
                  onChange={(e) => setTrainingSpeed(parseInt(e.target.value) || animationSpeeds.NORMAL)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={animationSpeeds.SLOW}>Slow (1s)</option>
                  <option value={animationSpeeds.NORMAL}>Normal (100ms)</option>
                  <option value={animationSpeeds.FAST}>Fast (10ms)</option>
                  <option value={animationSpeeds.VERY_FAST}>Very Fast (1ms)</option>
                </select>
              </div>

              {/* Max Episodes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Episodes
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={trainingStatus.maxEpisodes || 1000}
                  onChange={(e) => setMaxEpisodes(parseInt(e.target.value) || 1000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoStop || false}
                  onChange={(e) => setAutoStop(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                Auto-stop on convergence
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visualizeTraining !== false}
                  onChange={(e) => setVisualizeTraining(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                Visualize training
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;