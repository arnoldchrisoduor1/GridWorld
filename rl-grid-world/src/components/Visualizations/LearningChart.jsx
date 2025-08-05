import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Clock,
  Zap,
  Settings,
  Download,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter } from 'recharts';

/**
 * Learning Chart Component - Visualizes training progress and convergence
 */
const LearningChart = ({ 
  trainingData = [],
  isTraining = false,
  totalEpisodes = 0,
  successRate = 0,
  convergenceEpisode = null,
  isVisible = true,
  onToggleVisibility,
  onExportData
}) => {
  const [chartType, setChartType] = useState('reward');
  const [timeWindow, setTimeWindow] = useState('all'); // 'all', 'recent', 'window'
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [smoothing, setSmoothing] = useState(10);
  const [showTrendline, setShowTrendline] = useState(true);
  const [windowSize, setWindowSize] = useState(100);

  // Process and smooth training data
  const processedData = useMemo(() => {
    if (!trainingData || trainingData.length === 0) return [];
    
    let data = [...trainingData];
    
    // Apply time window filter
    if (timeWindow === 'recent') {
      data = data.slice(-100);
    } else if (timeWindow === 'window') {
      data = data.slice(-windowSize);
    }
    
    // Apply smoothing
    if (smoothing > 1) {
      const smoothed = [];
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - Math.floor(smoothing / 2));
        const end = Math.min(data.length, i + Math.floor(smoothing / 2) + 1);
        const window = data.slice(start, end);
        
        const avgReward = window.reduce((sum, ep) => sum + ep.totalReward, 0) / window.length;
        const avgSteps = window.reduce((sum, ep) => sum + ep.steps, 0) / window.length;
        const avgEpsilon = window.reduce((sum, ep) => sum + (ep.epsilon || 0), 0) / window.length;
        const avgQChange = window.reduce((sum, ep) => sum + (ep.qTableChange || 0), 0) / window.length;
        
        smoothed.push({
          ...data[i],
          smoothedReward: avgReward,
          smoothedSteps: avgSteps,
          smoothedEpsilon: avgEpsilon,
          smoothedQChange: avgQChange,
          movingAvgReward: avgReward,
          successRate: window.filter(ep => ep.success).length / window.length * 100
        });
      }
      return smoothed;
    }
    
    // Add moving averages and success rates
    return data.map((episode, index) => {
      const windowStart = Math.max(0, index - 19); // 20-episode window
      const windowData = data.slice(windowStart, index + 1);
      const movingAvgReward = windowData.reduce((sum, ep) => sum + ep.totalReward, 0) / windowData.length;
      const successRate = windowData.filter(ep => ep.success).length / windowData.length * 100;
      
      return {
        ...episode,
        movingAvgReward,
        successRate
      };
    });
  }, [trainingData, timeWindow, smoothing, windowSize]);

  // Calculate trend line data
  const trendlineData = useMemo(() => {
    if (!showTrendline || processedData.length < 2) return null;
    
    const xValues = processedData.map((_, i) => i);
    const yValues = processedData.map(d => {
      switch (chartType) {
        case 'reward': return smoothing > 1 ? d.smoothedReward : d.totalReward;
        case 'steps': return smoothing > 1 ? d.smoothedSteps : d.steps;
        case 'qchange': return smoothing > 1 ? d.smoothedQChange : (d.qTableChange || 0);
        default: return d.totalReward;
      }
    });
    
    // Simple linear regression
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return xValues.map(x => ({
      episode: x,
      trend: slope * x + intercept
    }));
  }, [processedData, showTrendline, chartType, smoothing]);

  // Chart configuration based on type
  const getChartConfig = useCallback(() => {
    switch (chartType) {
      case 'reward':
        return {
          title: 'Episode Rewards',
          dataKey: smoothing > 1 ? 'smoothedReward' : 'totalReward',
          color: '#3b82f6',
          yAxisLabel: 'Total Reward',
          showMovingAverage: true
        };
      case 'steps':
        return {
          title: 'Steps per Episode',
          dataKey: smoothing > 1 ? 'smoothedSteps' : 'steps',
          color: '#10b981',
          yAxisLabel: 'Steps',
          showMovingAverage: true
        };
      case 'success':
        return {
          title: 'Success Rate',
          dataKey: 'successRate',
          color: '#f59e0b',
          yAxisLabel: 'Success Rate (%)',
          showMovingAverage: false
        };
      case 'epsilon':
        return {
          title: 'Exploration Rate (ε)',
          dataKey: smoothing > 1 ? 'smoothedEpsilon' : 'epsilon',
          color: '#8b5cf6',
          yAxisLabel: 'Epsilon',
          showMovingAverage: false
        };
      case 'qchange':
        return {
          title: 'Q-Table Change',
          dataKey: smoothing > 1 ? 'smoothedQChange' : 'qTableChange',
          color: '#ef4444',
          yAxisLabel: 'Q-Table Change',
          showMovingAverage: true
        };
      case 'comparison':
        return {
          title: 'Multi-Metric Comparison',
          dataKey: null,
          color: null,
          yAxisLabel: 'Normalized Values',
          showMovingAverage: false
        };
      default:
        return {
          title: 'Episode Rewards',
          dataKey: 'totalReward',
          color: '#3b82f6',
          yAxisLabel: 'Total Reward',
          showMovingAverage: true
        };
    }
  }, [chartType, smoothing]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">Episode {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
          {data.success !== undefined && (
            <p className={`text-sm ${data.success ? 'text-green-600' : 'text-red-600'}`}>
              {data.success ? '✓ Success' : '✗ Failed'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    const config = getChartConfig();
    
    if (chartType === 'comparison') {
      // Normalize data for comparison
      const normalizedData = processedData.map(d => {
        const maxReward = Math.max(...processedData.map(p => p.totalReward));
        const maxSteps = Math.max(...processedData.map(p => p.steps));
        const maxQChange = Math.max(...processedData.map(p => p.qTableChange || 0));
        
        return {
          episode: d.episode,
          reward: (d.totalReward / maxReward) * 100,
          steps: (d.steps / maxSteps) * 100,
          qchange: ((d.qTableChange || 0) / maxQChange) * 100,
          success: d.success ? 100 : 0
        };
      });
      
      return (
        <LineChart data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="episode" stroke="#666" />
          <YAxis stroke="#666" label={{ value: 'Normalized %', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="reward" stroke="#3b82f6" strokeWidth={2} dot={false} name="Reward" />
          <Line type="monotone" dataKey="steps" stroke="#10b981" strokeWidth={2} dot={false} name="Steps (inverted)" />
          <Line type="monotone" dataKey="qchange" stroke="#ef4444" strokeWidth={2} dot={false} name="Q-Change" />
          <Line type="monotone" dataKey="success" stroke="#f59e0b" strokeWidth={2} dot={false} name="Success" />
        </LineChart>
      );
    }
    
    return (
      <LineChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="episode" stroke="#666" />
        <YAxis stroke="#666" label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {/* Main data line */}
        <Line 
          type="monotone" 
          dataKey={config.dataKey} 
          stroke={config.color} 
          strokeWidth={2}
          dot={processedData.length < 50}
          name={config.title}
        />
        
        {/* Moving average line */}
        {config.showMovingAverage && smoothing === 1 && (
          <Line 
            type="monotone" 
            dataKey="movingAvgReward" 
            stroke={config.color} 
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="Moving Average"
          />
        )}
        
        {/* Trend line */}
        {showTrendline && trendlineData && (
          <Line 
            data={trendlineData}
            type="monotone" 
            dataKey="trend" 
            stroke="#ff6b6b" 
            strokeWidth={2}
            strokeDasharray="10 5"
            dot={false}
            name="Trend"
          />
        )}
        
        {/* Convergence marker */}
        {convergenceEpisode && (
          <Line
            data={[
              { episode: convergenceEpisode, value: 0 },
              { episode: convergenceEpisode, value: 1000 }
            ]}
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="2 2"
            dot={false}
            name="Convergence"
          />
        )}
      </LineChart>
    );
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${isExpanded ? 'col-span-2' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">Learning Progress</h3>
          {isTraining && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Activity className="w-4 h-4 animate-pulse" />
              Training...
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="reward">Rewards</option>
            <option value="steps">Steps</option>
            <option value="success">Success Rate</option>
            <option value="epsilon">Exploration</option>
            <option value="qchange">Q-Table Change</option>
            <option value="comparison">Multi-Metric</option>
          </select>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Chart Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onExportData}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Export Data"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={onToggleVisibility}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Toggle Visibility"
          >
            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-3 gap-4">
            {/* Time Window */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Window
              </label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Episodes</option>
                <option value="recent">Recent 100</option>
                <option value="window">Custom Window</option>
              </select>
              {timeWindow === 'window' && (
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value))}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 mt-1"
                  placeholder="Window size"
                />
              )}
            </div>

            {/* Smoothing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Smoothing
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={smoothing}
                onChange={(e) => setSmoothing(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{smoothing} episodes</span>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showTrendline}
                    onChange={(e) => setShowTrendline(e.target.checked)}
                    className="rounded"
                  />
                  Show Trendline
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={`p-4 ${isExpanded ? 'h-96' : 'h-64'}`}>
        {processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No training data available</p>
              <p className="text-sm">Start training to see learning progress</p>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Footer */}
      {processedData.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Episodes:</span>
              <span className="ml-1 font-medium">{totalEpisodes}</span>
            </div>
            <div>
              <span className="text-gray-600">Success Rate:</span>
              <span className="ml-1 font-medium">{successRate.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Reward:</span>
              <span className="ml-1 font-medium">
                {processedData.length > 0 
                  ? (processedData.reduce((sum, ep) => sum + ep.totalReward, 0) / processedData.length).toFixed(2)
                  : '0.00'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-600">Convergence:</span>
              <span className="ml-1 font-medium">
                {convergenceEpisode ? `Episode ${convergenceEpisode}` : 'Not detected'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningChart;