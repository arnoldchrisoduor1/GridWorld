import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Clock, 
  Award, 
  Activity,
  Eye,
  EyeOff,
  Info,
  Download
} from 'lucide-react';

/**
 * Comprehensive metrics panel for RL training analysis
 */
const MetricsPanel = ({ 
  qLearning = null, 
  training = null, 
  episodes = [], 
  isVisible = true, 
  onToggleVisibility,
  trainingStats = null,
  qLearningStats = null,
  isTraining = false
}) => {
  const [selectedMetric, setSelectedMetric] = useState('episode');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Safely extract data from props with fallbacks
  const safeQLearning = qLearning || {};
  const safeTraining = training || {};
  const safeParameters = safeQLearning.parameters || {
    epsilon: 0.1,
    learningRate: 0.1,
    discountFactor: 0.9,
    minEpsilon: 0.01,
    epsilonDecay: 0.01
  };

  /**
   * Calculate comprehensive training statistics
   */
  const statistics = useMemo(() => {
    if (!episodes || episodes.length === 0) {
      return {
        totalEpisodes: 0,
        averageSteps: 0,
        averageReward: 0,
        convergenceRate: 0,
        explorationRate: safeParameters.epsilon || 0.1,
        successRate: 0,
        bestEpisode: null,
        recentPerformance: [],
        convergenceEpisode: null
      };
    }

    const totalEpisodes = episodes.length;
    const recentWindow = Math.min(100, episodes.length);
    const recentEpisodes = episodes.slice(-recentWindow);
    
    // Basic statistics with safe property access
    const totalSteps = episodes.reduce((sum, ep) => sum + (ep.steps || 0), 0);
    const totalReward = episodes.reduce((sum, ep) => sum + (ep.totalReward || ep.reward || 0), 0);
    const averageSteps = totalEpisodes > 0 ? totalSteps / totalEpisodes : 0;
    const averageReward = totalEpisodes > 0 ? totalReward / totalEpisodes : 0;
    
    // Success rate (episodes that reached goal)
    const successfulEpisodes = episodes.filter(ep => ep.reachedGoal || ep.success).length;
    const successRate = totalEpisodes > 0 ? (successfulEpisodes / totalEpisodes) * 100 : 0;
    
    // Best episode with safe comparison
    const bestEpisode = episodes.length > 0 ? episodes.reduce((best, current) => {
      const currentReward = current.totalReward || current.reward || 0;
      const bestReward = best.totalReward || best.reward || 0;
      return currentReward > bestReward ? current : best;
    }) : null;
    
    // Recent performance trend
    const recentPerformance = recentEpisodes.map((ep, idx) => ({
      episode: totalEpisodes - recentWindow + idx + 1,
      steps: ep.steps || 0,
      reward: ep.totalReward || ep.reward || 0,
      reachedGoal: ep.reachedGoal || ep.success || false
    }));
    
    // Convergence detection
    const convergenceWindow = 50;
    let convergenceEpisode = null;
    if (episodes.length >= convergenceWindow) {
      for (let i = convergenceWindow; i < episodes.length; i++) {
        const window = episodes.slice(i - convergenceWindow, i);
        const avgSteps = window.reduce((sum, ep) => sum + (ep.steps || 0), 0) / convergenceWindow;
        const variance = window.reduce((sum, ep) => {
          const steps = ep.steps || 0;
          return sum + Math.pow(steps - avgSteps, 2);
        }, 0) / convergenceWindow;
        
        if (variance < 10 && avgSteps < averageSteps * 1.1) {
          convergenceEpisode = i + 1;
          break;
        }
      }
    }
    
    // Learning rate calculation
    const earlyWindow = episodes.slice(0, Math.min(50, episodes.length));
    const lateWindow = episodes.slice(-Math.min(50, episodes.length));
    const earlyAvgSteps = earlyWindow.length > 0 ? 
      earlyWindow.reduce((sum, ep) => sum + (ep.steps || 0), 0) / earlyWindow.length : 0;
    const lateAvgSteps = lateWindow.length > 0 ? 
      lateWindow.reduce((sum, ep) => sum + (ep.steps || 0), 0) / lateWindow.length : 0;
    const convergenceRate = earlyAvgSteps > 0 ? ((earlyAvgSteps - lateAvgSteps) / earlyAvgSteps) * 100 : 0;
    
    return {
      totalEpisodes,
      averageSteps: Math.round(averageSteps * 100) / 100,
      averageReward: Math.round(averageReward * 100) / 100,
      convergenceRate: Math.max(0, Math.round(convergenceRate * 100) / 100),
      explorationRate: safeParameters.epsilon || 0.1,
      successRate: Math.round(successRate * 100) / 100,
      bestEpisode,
      recentPerformance,
      convergenceEpisode
    };
  }, [episodes, safeParameters.epsilon]);

  /**
   * Q-table statistics with safe property access
   */
  const qTableStats = useMemo(() => {
    const defaultStats = {
      totalStates: 0,
      learnedStates: 0,
      avgQValue: 0,
      maxQValue: 0,
      minQValue: 0,
      convergence: 0
    };

    if (!safeQLearning.qTable) {
      return defaultStats;
    }

    try {
      // Handle different Q-table structures
      let states, qValues = [];
      
      if (Array.isArray(safeQLearning.qTable)) {
        // Array-based Q-table
        states = safeQLearning.qTable;
        states.forEach((stateActions, stateIndex) => {
          if (Array.isArray(stateActions)) {
            qValues = qValues.concat(stateActions);
          }
        });
      } else if (typeof safeQLearning.qTable === 'object') {
        // Object-based Q-table
        states = Object.keys(safeQLearning.qTable);
        states.forEach(state => {
          const stateValues = safeQLearning.qTable[state];
          if (Array.isArray(stateValues)) {
            qValues = qValues.concat(stateValues);
          } else if (typeof stateValues === 'object') {
            qValues = qValues.concat(Object.values(stateValues));
          }
        });
      } else {
        return defaultStats;
      }

      const totalStates = states.length;
      let learnedStates = 0;

      if (Array.isArray(safeQLearning.qTable)) {
        learnedStates = safeQLearning.qTable.filter(stateActions => 
          Array.isArray(stateActions) && stateActions.some(val => Math.abs(val) > 0.01)
        ).length;
      } else {
        states.forEach(state => {
          const stateValues = Array.isArray(safeQLearning.qTable[state]) ? 
            safeQLearning.qTable[state] : 
            Object.values(safeQLearning.qTable[state] || {});
          
          const hasLearning = stateValues.some(val => Math.abs(val) > 0.01);
          if (hasLearning) learnedStates++;
        });
      }

      const validQValues = qValues.filter(val => typeof val === 'number' && !isNaN(val));
      const avgQValue = validQValues.length > 0 ? validQValues.reduce((sum, val) => sum + val, 0) / validQValues.length : 0;
      const maxQValue = validQValues.length > 0 ? Math.max(...validQValues) : 0;
      const minQValue = validQValues.length > 0 ? Math.min(...validQValues) : 0;
      const convergence = totalStates > 0 ? (learnedStates / totalStates) * 100 : 0;

      return {
        totalStates,
        learnedStates,
        avgQValue: Math.round(avgQValue * 1000) / 1000,
        maxQValue: Math.round(maxQValue * 1000) / 1000,
        minQValue: Math.round(minQValue * 1000) / 1000,
        convergence: Math.round(convergence * 100) / 100
      };
    } catch (error) {
      console.warn('Error calculating Q-table statistics:', error);
      return defaultStats;
    }
  }, [safeQLearning.qTable]);

  /**
   * Export training data
   */
  const exportData = () => {
    const data = {
      parameters: safeParameters,
      algorithm: safeQLearning.algorithm || 'Q-Learning',
      episodes: episodes || [],
      statistics: statistics,
      qTableStats: qTableStats,
      trainingStats: trainingStats,
      qLearningStats: qLearningStats,
      timestamp: new Date().toISOString()
    };
    
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rl-training-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  /**
   * Metric card component
   */
  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center text-xs ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={onToggleVisibility}
          className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg transition-colors"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Training Metrics</h2>
            <p className="text-sm text-gray-600">Real-time performance analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export training data"
          >
            <Download className="w-4 h-4" />
          </button>
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Training Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Episodes"
          value={statistics.totalEpisodes}
          subtitle={isTraining ? "Training..." : "Complete"}
          icon={Activity}
          color="blue"
        />
        
        <MetricCard
          title="Success Rate"
          value={`${statistics.successRate}%`}
          subtitle={`${episodes.filter(ep => ep.reachedGoal || ep.success).length} successes`}
          icon={Target}
          trend={statistics.convergenceRate}
          color="green"
        />
        
        <MetricCard
          title="Avg Steps"
          value={statistics.averageSteps}
          subtitle="Steps per episode"
          icon={Clock}
          color="orange"
        />
        
        <MetricCard
          title="Avg Reward"
          value={statistics.averageReward}
          subtitle="Cumulative reward"
          icon={Award}
          color="purple"
        />
      </div>

      {/* Algorithm Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            Algorithm Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Algorithm:</span>
              <span className="font-medium">{safeQLearning.algorithm || 'Q-Learning'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Exploration (ε):</span>
              <span className="font-medium">{(safeParameters.epsilon || 0.1).toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Learning Rate (α):</span>
              <span className="font-medium">{safeParameters.learningRate || 0.1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discount (γ):</span>
              <span className="font-medium">{safeParameters.discountFactor || 0.9}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Q-Table Statistics
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">States Explored:</span>
              <span className="font-medium">{qTableStats.learnedStates}/{qTableStats.totalStates}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Coverage:</span>
              <span className="font-medium">{qTableStats.convergence}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Q-Value:</span>
              <span className="font-medium">{qTableStats.avgQValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Q-Range:</span>
              <span className="font-medium">{qTableStats.minQValue} to {qTableStats.maxQValue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      {statistics.bestEpisode && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-600" />
            Best Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Episode</div>
              <div className="font-medium">{episodes.indexOf(statistics.bestEpisode) + 1}</div>
            </div>
            <div>
              <div className="text-gray-600">Steps</div>
              <div className="font-medium">{statistics.bestEpisode.steps || 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-600">Reward</div>
              <div className="font-medium">{statistics.bestEpisode.totalReward || statistics.bestEpisode.reward || 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-600">Reached Goal</div>
              <div className={`font-medium ${(statistics.bestEpisode.reachedGoal || statistics.bestEpisode.success) ? 'text-green-600' : 'text-red-600'}`}>
                {(statistics.bestEpisode.reachedGoal || statistics.bestEpisode.success) ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Metrics */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <Info className="w-4 h-4" />
          Advanced Metrics
          <div className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </button>

        {showAdvanced && (
          <div className="space-y-4">
            {/* Convergence Analysis */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Convergence Analysis</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Convergence Rate</div>
                  <div className="font-medium">{statistics.convergenceRate}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Convergence Episode</div>
                  <div className="font-medium">
                    {statistics.convergenceEpisode ? `#${statistics.convergenceEpisode}` : 'Not detected'}
                  </div>
                </div>
              </div>
              {statistics.convergenceRate > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Performance improved by {statistics.convergenceRate}% from initial episodes
                </div>
              )}
            </div>

            {/* Recent Performance Trend */}
            {statistics.recentPerformance.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Recent Performance (Last {statistics.recentPerformance.length} Episodes)</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Avg Steps</div>
                    <div className="font-medium">
                      {Math.round((statistics.recentPerformance.reduce((sum, ep) => sum + ep.steps, 0) / statistics.recentPerformance.length) * 100) / 100}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Avg Reward</div>
                    <div className="font-medium">
                      {Math.round((statistics.recentPerformance.reduce((sum, ep) => sum + ep.reward, 0) / statistics.recentPerformance.length) * 100) / 100}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Success Rate</div>
                    <div className="font-medium">
                      {Math.round((statistics.recentPerformance.filter(ep => ep.reachedGoal).length / statistics.recentPerformance.length) * 10000) / 100}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Training Efficiency */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Training Efficiency</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Episodes per minute:</span>
                  <span className="font-medium">
                    {safeTraining.episodesPerMinute ? Math.round(safeTraining.episodesPerMinute * 100) / 100 : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Training time:</span>
                  <span className="font-medium">
                    {safeTraining.elapsedTime ? `${Math.round(safeTraining.elapsedTime / 1000)}s` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current speed:</span>
                  <span className="font-medium">{safeTraining.speed || '1'}x</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;