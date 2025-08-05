import React, { useState, useCallback } from 'react';
import { 
  Settings, 
  RotateCcw, 
  Save, 
  Upload, 
  Download,
  Info,
  Sliders,
  Brain,
  Target,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  ALGORITHMS, 
  EXPLORATION_STRATEGIES, 
  REWARDS,
  DEFAULT_RL_PARAMS,
  RL_PARAM_RANGES 
} from '../utils/constants.js';

/**
 * Advanced parameter controls for RL algorithms
 */
const ParameterControls = ({ qLearning, onClose }) => {
  const [activeTab, setActiveTab] = useState('algorithm');
  const [tempParameters, setTempParameters] = useState(qLearning.parameters);
  const [hasChanges, setHasChanges] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  /**
   * Parameter presets for different scenarios
   */
  const parameterPresets = {
    'Fast Learning': {
      learningRate: 0.8,
      discountFactor: 0.95,
      epsilon: 0.1,
      epsilonDecay: 0.01,
      minEpsilon: 0.01
    },
    'Stable Learning': {
      learningRate: 0.1,
      discountFactor: 0.9,
      epsilon: 0.1,
      epsilonDecay: 0.001,
      minEpsilon: 0.01
    },
    'Exploration Heavy': {
      learningRate: 0.3,
      discountFactor: 0.85,
      epsilon: 0.3,
      epsilonDecay: 0.001,
      minEpsilon: 0.05
    },
    'Conservative': {
      learningRate: 0.05,
      discountFactor: 0.99,
      epsilon: 0.05,
      epsilonDecay: 0.0001,
      minEpsilon: 0.001
    }
  };

  /**
   * Update temporary parameters
   */
  const updateTempParameter = useCallback((param, value) => {
    setTempParameters(prev => {
      const newParams = { ...prev, [param]: value };
      setHasChanges(JSON.stringify(newParams) !== JSON.stringify(qLearning.parameters));
      return newParams;
    });
  }, [qLearning.parameters]);

  /**
   * Apply parameters to Q-learning
   */
  const applyParameters = useCallback(() => {
    qLearning.updateParameters(tempParameters);
    setHasChanges(false);
  }, [qLearning, tempParameters]);

  /**
   * Reset to current Q-learning parameters
   */
  const resetParameters = useCallback(() => {
    setTempParameters(qLearning.parameters);
    setHasChanges(false);
  }, [qLearning.parameters]);

  /**
   * Reset to default parameters
   */
  const resetToDefaults = useCallback(() => {
    setTempParameters(DEFAULT_RL_PARAMS);
    setHasChanges(true);
  }, []);

  /**
   * Load parameter preset
   */
  const loadPreset = useCallback((preset) => {
    setTempParameters(prev => ({ ...prev, ...parameterPresets[preset] }));
    setHasChanges(true);
    setShowPresets(false);
  }, []);

  /**
   * Export parameters to JSON
   */
  const exportParameters = useCallback(() => {
    const dataStr = JSON.stringify(tempParameters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rl-parameters-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [tempParameters]);

  /**
   * Import parameters from JSON file
   */
  const importParameters = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          setTempParameters(imported);
          setHasChanges(true);
        } catch (error) {
          alert('Invalid parameter file format');
        }
      };
      reader.readAsText(file);
    }
  }, []);

  /**
   * Parameter slider component
   */
  const ParameterSlider = ({ 
    label, 
    param, 
    min, 
    max, 
    step, 
    description, 
    formatValue = (v) => v.toFixed(3) 
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          {label}
          <div className="group relative">
            <Info className="w-3 h-3 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
              {description}
            </div>
          </div>
        </label>
        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
          {formatValue(tempParameters[param])}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={tempParameters[param]}
        onChange={(e) => updateTempParameter(param, parseFloat(e.target.value))}
        className="parameter-slider w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );

  /**
   * Tab navigation
   */
  const tabs = [
    { id: 'algorithm', label: 'Algorithm', icon: Brain },
    { id: 'learning', label: 'Learning', icon: TrendingUp },
    { id: 'exploration', label: 'Exploration', icon: Target },
    { id: 'rewards', label: 'Rewards', icon: Zap },
    { id: 'presets', label: 'Presets', icon: Save }
  ];

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">RL Parameters</h2>
              <p className="text-indigo-100">Configure reinforcement learning algorithm settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Changes Indicator */}
        {hasChanges && (
          <div className="mt-4 flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-yellow-200" />
            <span className="text-yellow-100 text-sm">You have unsaved changes</span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={resetParameters}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyParameters}
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 rounded text-sm font-medium transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Algorithm Tab */}
        {activeTab === 'algorithm' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Algorithm Selection</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ALGORITHMS).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      qLearning.algorithm === value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => qLearning.setAlgorithm(value)}
                  >
                    <h4 className="font-medium text-gray-900">{value}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {key === 'Q_LEARNING' && 'Off-policy temporal difference learning'}
                      {key === 'SARSA' && 'On-policy temporal difference learning'}
                      {key === 'EXPECTED_SARSA' && 'Expected value SARSA variant'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exploration Strategy</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(EXPLORATION_STRATEGIES).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      qLearning.explorationStrategy === value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => qLearning.setExplorationStrategy(value)}
                  >
                    <h4 className="font-medium text-gray-900">{value}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {key === 'EPSILON_GREEDY' && 'Random action with probability ε'}
                      {key === 'UCB' && 'Upper Confidence Bound selection'}
                      {key === 'BOLTZMANN' && 'Temperature-based probabilistic selection'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Learning Tab */}
        {activeTab === 'learning' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Learning Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ParameterSlider
                label="Learning Rate (α)"
                param="learningRate"
                min={RL_PARAM_RANGES.learningRate.min}
                max={RL_PARAM_RANGES.learningRate.max}
                step={0.01}
                description="How much to update Q-values on each step. Higher values learn faster but may be less stable."
              />
              
              <ParameterSlider
                label="Discount Factor (γ)"
                param="discountFactor"
                min={RL_PARAM_RANGES.discountFactor.min}
                max={RL_PARAM_RANGES.discountFactor.max}
                step={0.01}
                description="How much to value future rewards. Higher values consider long-term rewards more."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Learning Rate Guide</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>0.01-0.1:</strong> Conservative learning, stable but slow</p>
                <p><strong>0.1-0.5:</strong> Balanced learning rate for most scenarios</p>
                <p><strong>0.5-1.0:</strong> Aggressive learning, fast but potentially unstable</p>
              </div>
            </div>
          </div>
        )}

        {/* Exploration Tab */}
        {activeTab === 'exploration' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Exploration Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ParameterSlider
                label="Epsilon (ε)"
                param="epsilon"
                min={RL_PARAM_RANGES.epsilon.min}
                max={RL_PARAM_RANGES.epsilon.max}
                step={0.01}
                description="Probability of taking random actions for exploration"
              />
              
              <ParameterSlider
                label="Epsilon Decay"
                param="epsilonDecay"
                min={RL_PARAM_RANGES.epsilonDecay.min}
                max={RL_PARAM_RANGES.epsilonDecay.max}
                step={0.0001}
                description="Rate at which epsilon decreases over time"
                formatValue={(v) => v.toFixed(4)}
              />
              
              <ParameterSlider
                label="Minimum Epsilon"
                param="minEpsilon"
                min={0.001}
                max={0.1}
                step={0.001}
                description="Minimum exploration rate to maintain"
                formatValue={(v) => v.toFixed(3)}
              />
              
              {qLearning.explorationStrategy === EXPLORATION_STRATEGIES.BOLTZMANN && (
                <ParameterSlider
                  label="Temperature"
                  param="temperature"
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  description="Controls randomness in Boltzmann exploration. Higher = more random"
                  formatValue={(v) => v.toFixed(1)}
                />
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Exploration Strategy Guide</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>ε-greedy:</strong> Simple random exploration with probability ε</p>
                <p><strong>UCB:</strong> Optimistic exploration favoring uncertain actions</p>
                <p><strong>Boltzmann:</strong> Probabilistic selection based on Q-values</p>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Reward Structure</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(REWARDS).map(([key, config]) => (
                <div
                  key={key}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    qLearning.rewardStructure === key
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => qLearning.setRewardStructure(key)}
                >
                  <h4 className="font-medium text-gray-900 capitalize">{key.replace('_', ' ')}</h4>
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <div>Goal: {config.goal}</div>
                    <div>Step: {config.step}</div>
                    <div>Wall: {config.wall}</div>
                    {config.distance && <div>Distance-based rewards</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Reward Design Tips</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                <p><strong>Default:</strong> Simple sparse rewards, good for basic learning</p>
                <p><strong>Dense:</strong> More frequent feedback, faster convergence</p>
                <p><strong>Sparse:</strong> Minimal guidance, requires more exploration</p>
              </div>
            </div>
          </div>
        )}

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Parameter Presets</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(parameterPresets).map(([name, preset]) => (
                <div
                  key={name}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-all"
                  onClick={() => loadPreset(name)}
                >
                  <h4 className="font-medium text-gray-900 mb-2">{name}</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>α: {preset.learningRate}</div>
                    <div>γ: {preset.discountFactor}</div>
                    <div>ε: {preset.epsilon}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={exportParameters}
                className="control-button bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Download className="w-4 h-4" />
                Export Parameters
              </button>
              
              <label className="control-button bg-green-500 hover:bg-green-600 text-white cursor-pointer">
                <Upload className="w-4 h-4" />
                Import Parameters
                <input
                  type="file"
                  accept=".json"
                  onChange={importParameters}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={resetToDefaults}
                className="control-button bg-gray-500 hover:bg-gray-600 text-white"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParameterControls;