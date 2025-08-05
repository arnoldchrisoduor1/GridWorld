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
  Info
} from 'lucide-react';
import { TRAINING, ALGORITHMS, EXPLORATION_STRATEGIES } from '../utils/constants';

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

  const { trainingStatus, startTraining, pauseTraining, resumeTraining, stopTraining, resetTraining, stepOnce } = training;
  
  /**
   * Handle training control actions
   */
  const handleTrainingAction = (action) => {
    switch (action) {
      case 'start':
        if (!qLearning.isInitialized) {
          qLearning.initializeQLearning();
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
        disabled: !qLearning.isInitialized && !gridWorld.startPos
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
    const { currentEpisode, maxEpisodes, progress } = trainingStatus;
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
   * Tooltip component
   */
  const Tooltip = ({ children, content, id }) => (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(id)}
      onMouseLeave={() => setShowTooltip(null)}
    >
      {children}
      {showTooltip === id && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );

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
                Algorithm: {qLearning.algorithm} | Strategy: {qLearning.explorationStrategy}
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
            {qLearning.trainingStats.convergenceInfo.isConverged && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                Converged
              </span>
            )}
            {trainingStatus.episodeReward !== 0 && (
              <span className="text-sm text-gray-600">
                Reward: {trainingStatus.episodeReward.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {trainingStatus.isTraining && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{trainingStatus.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, trainingStatus.progress)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className="p-4">
        <div className="flex gap-3 mb-4">
          {/* Primary Training Button */}
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

          {/* Stop Button */}
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

          {/* Step Button */}
          {!trainingStatus.isTraining && (
            <Tooltip content="Execute single step" id="step-btn">
              <button
                onClick={() => handleTrainingAction('step')}
                disabled={!qLearning.isInitialized}
                className="control-button bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {/* Reset Button */}
          <Tooltip content="Reset training" id="reset-btn">
            <button
              onClick={() => handleTrainingAction('reset')}
              className="control-button bg-gray-600 hover:bg-gray-700 text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Tooltip content="Training parameters" id="params-btn">
            <button
              onClick={onShowParameters}
              className="control-button bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
            >
              <Settings className="w-4 h-4" />
              Parameters
            </button>
          </Tooltip>

          <Tooltip content="Performance metrics" id="metrics-btn">
            <button
              onClick={onShowMetrics}
              className="control-button bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              Metrics
            </button>
          </Tooltip>

          <Tooltip content="Visualizations" id="viz-btn">
            <button
              onClick={onShowVisualization}
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
                  <span className="font-medium">{qLearning.trainingStats.totalSteps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Explored States:</span>
                  <span className="font-medium">
                    {qLearning.trainingStats.exploredStates}/{qLearning.trainingStats.totalStates}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current ε:</span>
                  <span className="font-medium">{qLearning.parameters.epsilon.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Episode Stats */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Current Episode</h4>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>Steps:</span>
                  <span className="font-medium">{trainingStatus.episodeSteps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reward:</span>
                  <span className="font-medium">{trainingStatus.episodeReward.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Position:</span>
                  <span className="font-medium">
                    {trainingStatus.agentPosition ? 
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
                  value={training.trainingStatus.speed || TRAINING.ANIMATION_SPEEDS.NORMAL}
                  onChange={(e) => training.setTrainingSpeed(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={TRAINING.ANIMATION_SPEEDS.SLOW}>Slow (1s)</option>
                  <option value={TRAINING.ANIMATION_SPEEDS.NORMAL}>Normal (100ms)</option>
                  <option value={TRAINING.ANIMATION_SPEEDS.FAST}>Fast (10ms)</option>
                  <option value={TRAINING.ANIMATION_SPEEDS.VERY_FAST}>Very Fast (1ms)</option>
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
                  value={trainingStatus.maxEpisodes}
                  onChange={(e) => training.setMaxEpisodes(parseInt(e.target.value) || 1000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={training.autoStop}
                  onChange={(e) => training.setAutoStop(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                Auto-stop on convergence
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={training.visualizeTraining}
                  onChange={(e) => training.setVisualizeTraining(e.target.checked)}
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