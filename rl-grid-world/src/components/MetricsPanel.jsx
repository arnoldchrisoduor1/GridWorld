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
  qLearning, 
  training, 
  episodes = [], 
  isVisible = true, 
  onToggleVisibility 
}) => {
  const [selectedMetric, setSelectedMetric] = useState('episode');
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Calculate comprehensive training statistics
   */
  const statistics = useMemo(() => {
    if (episodes.length === 0) {
      return {
        totalEpisodes: 0,
        averageSteps: 0,
        averageReward: 0,
        convergenceRate: 0,
        explorationRate: qLearning.parameters.epsilon,
        successRate: 0,
        bestEpisode: null,
        recentPerformance: [],
        convergenceEpisode: null
      };
    }

    const totalEpisodes = episodes.length;
    const recentWindow = Math.min(100, episodes.length);
    const recentEpisodes = episodes.slice(-recentWindow);
    
    // Basic statistics
    const totalSteps = episodes.reduce((sum, ep) => sum + ep.steps, 0);
    const totalReward = episodes.reduce((sum, ep) => sum + ep.totalReward, 0);
    const averageSteps = totalSteps / totalEpisodes;
    const averageReward = totalReward / totalEpisodes;
    
    // Success rate (episodes that reached goal)
    const successfulEpisodes = episodes.filter(ep => ep.reachedGoal).length;
    const successRate = (successfulEpisodes / totalEpisodes) * 100;
    
    // Best episode
    const bestEpisode = episodes.reduce((best, current) => 
      current.totalReward > best.totalReward ? current : best
    );
    
    // Recent performance trend
    const recentPerformance = recentEpisodes.map((ep, idx) => ({
      episode: totalEpisodes - recentWindow + idx + 1,
      steps: ep.steps,
      reward: ep.totalReward,
      reachedGoal: ep.reachedGoal
    }));
    
    // Convergence detection
    const convergenceWindow = 50;
    let convergenceEpisode = null;
    if (episodes.length >= convergenceWindow) {
      for (let i = convergenceWindow; i < episodes.length; i++) {
        const window = episodes.slice(i - convergenceWindow, i);
        const avgSteps = window.reduce((sum, ep) => sum + ep.steps, 0) / convergenceWindow;
        const variance = window.reduce((sum, ep) => sum + Math.pow(ep.steps - avgSteps, 2), 0) / convergenceWindow;
        
        if (variance < 10 && avgSteps < averageSteps * 1.1) {
          convergenceEpisode = i + 1;
          break;
        }
      }
    }
    
    // Learning rate
    const earlyWindow = episodes.slice(0, Math.min(50, episodes.length));
    const lateWindow = episodes.slice(-Math.min(50, episodes.length));
    const earlyAvgSteps = earlyWindow.reduce((sum, ep) => sum + ep.steps, 0) / earlyWindow.length;
    const lateAvgSteps = lateWindow.reduce((sum, ep) => sum + ep.steps, 0) / lateWindow.length;
    const convergenceRate = earlyAvgSteps > 0 ? ((earlyAvgSteps - lateAvgSteps) / earlyAvgSteps) * 100 : 0;
    
    return {
      totalEpisodes,
      averageSteps: Math.round(averageSteps * 100) / 100,
      averageReward: Math.round(averageReward * 100) / 100,
      convergenceRate: Math.max(0, Math.round(convergenceRate * 100) / 100),
      explorationRate: qLearning?.parameters?.epsilon ?? 0,
      successRate: Math.round(successRate * 100) / 100,
      bestEpisode,
      recentPerformance,
      convergenceEpisode
    };
  }, [episodes, qLearning?.parameters?.epsilon]);

  /**
   * Q-table statistics
   */
  const qTableStats = useMemo(() => {
    if (!qLearning.qTable || Object.keys(qLearning.qTable).length === 0) {
      return {
        totalStates: 0,
        learnedStates: 0,
        avgQValue: 0,
        maxQValue: 0,
        minQValue: 0,
        convergence: 0
      };
    }

    const states = Object.keys(qLearning.qTable);
    const totalStates = states.length;
    let learnedStates = 0;
    let qValues = [];

    states.forEach(state => {
      const stateValues = Object.values(qLearning.qTable[state]);
      const hasLearning = stateValues.some(val => Math.abs(val) > 0.01);
      if (hasLearning) learnedStates++;
      qValues = qValues.concat(stateValues);
    });

    const avgQValue = qValues.length > 0 ? qValues.reduce((sum, val) => sum + val, 0) / qValues.length : 0;
    const maxQValue = qValues.length > 0 ? Math.max(...qValues) : 0;
    const minQValue = qValues.length > 0 ? Math.min(...qValues) : 0;
    const convergence = totalStates > 0 ? (learnedStates / totalStates) * 100 : 0;

    return {
      totalStates,
      learnedStates,
      avgQValue: Math.round(avgQValue * 1000) / 1000,
      maxQValue: Math.round(maxQValue * 1000) / 1000,
      minQValue: Math.round(minQValue * 1000) / 1000,
      convergence: Math.round(convergence * 100) / 100
    };
  }, [qLearning.qTable]);

  /**
   * Export training data
   */
  const exportData = () => {
    const data = {
      parameters: qLearning.parameters,
      algorithm: qLearning.algorithm,
      episodes: episodes,
      statistics: statistics,
      qTableStats: qTableStats,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rl-training-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Metric card component
   */
  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
            {Math.abs(trend)}%
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
          <button
            onClick={onToggleVisibility}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Training Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Episodes"
          value={statistics.totalEpisodes}
          subtitle={training.isTraining ? "Training..." : "Complete"}
          icon={Activity}
          color="blue"
        />
        
        <MetricCard
          title="Success Rate"
          value={`${statistics.successRate}%`}
          subtitle={`${episodes.filter(ep => ep.reachedGoal).length} successes`}
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
        <div className="metric-card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            Algorithm Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Algorithm:</span>
              <span className="font-medium">{qLearning.algorithm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Exploration (ε):</span>
              <span className="font-medium">{qLearning.parameters.epsilon.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Learning Rate (α):</span>
              <span className="font-medium">{qLearning.parameters.learningRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discount (γ):</span>
              <span className="font-medium">{qLearning.parameters.discountFactor}</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
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
        <div className="metric-card mb-6">
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
              <div className="font-medium">{statistics.bestEpisode.steps}</div>
            </div>
            <div>
              <div className="text-gray-600">Reward</div>
              <div className="font-medium">{statistics.bestEpisode.totalReward}</div>
            </div>
            <div>
              <div className="text-gray-600">Reached Goal</div>
              <div className={`font-medium ${statistics.bestEpisode.reachedGoal ? 'text-green-600' : 'text-red-600'}`}>
                {statistics.bestEpisode.reachedGoal ? 'Yes' : 'No'}
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
            <div className="metric-card">
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
              <div className="metric-card">
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
            <div className="metric-card">
              <h4 className="font-medium text-gray-900 mb-2">Training Efficiency</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Episodes per minute:</span>
                  <span className="font-medium">
                    {training.episodesPerMinute ? Math.round(training.episodesPerMinute * 100) / 100 : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Training time:</span>
                  <span className="font-medium">
                    {training.elapsedTime ? `${Math.round(training.elapsedTime / 1000)}s` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current speed:</span>
                  <span className="font-medium">{training.speed}x</span>
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