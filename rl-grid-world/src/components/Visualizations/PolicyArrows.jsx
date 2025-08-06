import React, { useMemo, useState, useCallback } from 'react';
import { 
  Navigation, 
  Eye, 
  EyeOff, 
  Settings,
  Target,
  TrendingUp,
  AlertCircle,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { 
  ACTIONS, 
  ACTION_VECTORS,
  ACTION_SYMBOLS,
  CELL_TYPES 
} from '../../utils/constants.js';
import { stateToPosition, positionToState } from '../../utils/gridUtils.js';

/**
 * Policy Arrows Component - Visualizes the learned policy with directional arrows
 */
const PolicyArrows = ({ 
  qTable,
  grid,
  gridSize,
  startPos,
  goalPos,
  agentPos,
  isVisible = true,
  showConfidence = true,
  minConfidence = 0.1,
  arrowStyle = 'modern',
  colorScheme = 'confidence',
  animateArrows = true,
  onToggleVisibility,
  onSettingsChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    showConfidence,
    minConfidence,
    arrowStyle,
    colorScheme,
    animateArrows,
    showValues: false,
    arrowSize: 'medium',
    transparentWeak: true
  });

  // Extract policy from Q-table
  const policy = useMemo(() => {
    if (!qTable) return {};
    
    const extractedPolicy = {};
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const state = positionToState([row, col], gridSize);
        const qValues = qTable[state];
        
        if (!qValues || Object.keys(qValues).length === 0) continue;
        
        // Find best action
        let bestAction = null;
        let bestValue = -Infinity;
        let actionValues = [];
        
        Object.entries(qValues).forEach(([action, value]) => {
          actionValues.push({ action, value });
          if (value > bestValue) {
            bestValue = value;
            bestAction = action;
          }
        });
        
        // Calculate confidence (difference between best and second best)
        actionValues.sort((a, b) => b.value - a.value);
        const confidence = actionValues.length > 1 
          ? (actionValues[0].value - actionValues[1].value) / (Math.abs(actionValues[0].value) + Math.abs(actionValues[1].value) + 1e-6)
          : 1.0;
        
        extractedPolicy[`${row}-${col}`] = {
          bestAction,
          bestValue,
          confidence: Math.max(0, Math.min(1, confidence)),
          allActions: actionValues,
          position: [row, col]
        };
      }
    }
    
    return extractedPolicy;
  }, [qTable, gridSize]);

  // Get arrow component for action
  const getArrowIcon = useCallback((action, size = 20) => {
    const iconProps = { size, strokeWidth: 2.5 };
    
    switch (action) {
      case ACTIONS.UP:
        return <ArrowUp {...iconProps} />;
      case ACTIONS.DOWN:
        return <ArrowDown {...iconProps} />;
      case ACTIONS.LEFT:
        return <ArrowLeft {...iconProps} />;
      case ACTIONS.RIGHT:
        return <ArrowRight {...iconProps} />;
      default:
        return <Target {...iconProps} />;
    }
  }, []);

  // Get arrow color based on confidence and color scheme
  const getArrowColor = useCallback((confidence, value) => {
    switch (localSettings.colorScheme) {
      case 'confidence':
        // Higher confidence = more blue
        const alpha = confidence;
        return `rgba(59, 130, 246, ${alpha})`;
      
      case 'value':
        // Higher value = more green, lower = more red
        const normalizedValue = Math.max(0, Math.min(1, (value + 1) / 2));
        const red = Math.round(255 * (1 - normalizedValue));
        const green = Math.round(255 * normalizedValue);
        return `rgb(${red}, ${green}, 0)`;
      
      case 'gradient':
        // Confidence affects hue (blue to green)
        const hue = 200 + (confidence * 80); // 200 (blue) to 280 (green)
        return `hsl(${hue}, 70%, 50%)`;
      
      case 'uniform':
        return '#3b82f6';
      
      default:
        return `rgba(59, 130, 246, ${confidence})`;
    }
  }, [localSettings.colorScheme]);

  // Get arrow size based on settings and confidence
  const getArrowSize = useCallback((confidence) => {
    const baseSize = {
      small: 16,
      medium: 20,
      large: 24
    }[localSettings.arrowSize] || 20;
    
    return localSettings.showConfidence 
      ? baseSize * (0.5 + confidence * 0.5)
      : baseSize;
  }, [localSettings.arrowSize, localSettings.showConfidence]);

  // Apply settings
  const applySettings = useCallback(() => {
    onSettingsChange?.(localSettings);
    setShowSettings(false);
  }, [localSettings, onSettingsChange]);

  if (!isVisible) return null;

  return (
    <div className="relative">
      {/* Control Header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-800">Policy Arrows</h3>
          <div className="text-sm text-gray-600">
            {Object.keys(policy).length} cells with policy
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Arrow Settings"
          >
            <Settings className="w-4 h-4" />
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
        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border">
          <div className="grid grid-cols-2 gap-4">
            {/* Minimum Confidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Confidence Threshold
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.minConfidence}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{(localSettings.minConfidence * 100).toFixed(0)}%</span>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Scheme
              </label>
              <select
                value={localSettings.colorScheme}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, colorScheme: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="confidence">Confidence-based</option>
                <option value="value">Value-based</option>
                <option value="gradient">Gradient</option>
                <option value="uniform">Uniform</option>
              </select>
            </div>

            {/* Arrow Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arrow Style
              </label>
              <select
                value={localSettings.arrowStyle}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, arrowStyle: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="modern">Modern Icons</option>
                <option value="classic">Classic Arrows</option>
                <option value="symbols">Unicode Symbols</option>
              </select>
            </div>

            {/* Arrow Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arrow Size
              </label>
              <select
                value={localSettings.arrowSize}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, arrowSize: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.showConfidence}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, showConfidence: e.target.checked }))}
                className="rounded"
              />
              Size by Confidence
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.animateArrows}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, animateArrows: e.target.checked }))}
                className="rounded"
              />
              Animate Arrows
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.showValues}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, showValues: e.target.checked }))}
                className="rounded"
              />
              Show Q-Values
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.transparentWeak}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, transparentWeak: e.target.checked }))}
                className="rounded"
              />
              Fade Weak Policies
            </label>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={applySettings}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Grid Overlay */}
      {Array.isArray(grid) && (
  <div className="relative">
    <div 
      className="grid gap-0 border border-gray-300 bg-transparent rounded-lg overflow-hidden"
      style={{ 
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        aspectRatio: '1'
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const cellType = grid[rowIndex][colIndex];
          const policyData = policy?.[`${rowIndex}-${colIndex}`];

          // Don't show arrows on walls or special cells
          if (
            cellType === CELL_TYPES.WALL ||
            (startPos && rowIndex === startPos[0] && colIndex === startPos[1]) ||
            (goalPos && rowIndex === goalPos[0] && colIndex === goalPos[1])
          ) {
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="aspect-square"
              />
            );
          }

          // Don't show if no policy or confidence too low
          if (!policyData || policyData.confidence < localSettings.minConfidence) {
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="aspect-square flex items-center justify-center"
              >
                {policyData && policyData.confidence < localSettings.minConfidence && (
                  <div className="w-2 h-2 bg-gray-300 rounded-full opacity-50" />
                )}
              </div>
            );
          }

          const { bestAction, bestValue, confidence } = policyData;
          const arrowSize = getArrowSize(confidence);
          const arrowColor = getArrowColor(confidence, bestValue);
          const opacity = localSettings.transparentWeak ? (0.3 + confidence * 0.7) : 1;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`aspect-square flex flex-col items-center justify-center relative ${
                localSettings.animateArrows ? 'transition-all duration-300' : ''
              }`}
              style={{ opacity }}
            >
              {/* Arrow */}
              <div 
                className={`flex items-center justify-center ${
                  localSettings.animateArrows ? 'hover:scale-110 transition-transform' : ''
                }`}
                style={{ color: arrowColor }}
              >
                {localSettings.arrowStyle === 'modern' && getArrowIcon(bestAction, arrowSize)}
                {['classic', 'symbols'].includes(localSettings.arrowStyle) && (
                  <div 
                    className="font-bold"
                    style={{ fontSize: `${arrowSize}px` }}
                  >
                    {ACTION_SYMBOLS[bestAction]}
                  </div>
                )}
              </div>

              {/* Q-Value Display */}
              {localSettings.showValues && (
                <div 
                  className="text-xs font-medium mt-1"
                  style={{ color: arrowColor, fontSize: `${Math.max(8, arrowSize * 0.4)}px` }}
                >
                  {bestValue.toFixed(1)}
                </div>
              )}

              {/* Confidence Indicator */}
              {localSettings.showConfidence && (
                <div 
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: arrowColor,
                    transform: `scale(${confidence})`,
                    opacity: confidence
                  }}
                />
              )}

              {/* Agent Position Highlight */}
              {agentPos && agentPos[0] === rowIndex && agentPos[1] === colIndex && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded animate-pulse" />
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
)}


      {/* Policy Statistics */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Cells with Policy:</span>
            <span className="ml-1 font-medium">{Object.keys(policy).length}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Confidence:</span>
            <span className="ml-1 font-medium">
              {Object.keys(policy).length > 0 
                ? (Object.values(policy).reduce((sum, p) => sum + p.confidence, 0) / Object.keys(policy).length * 100).toFixed(1)
                : '0'
              }%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Strong Policies:</span>
            <span className="ml-1 font-medium">
              {Object.values(policy).filter(p => p.confidence > 0.7).length}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Legend:</span>
            
            {localSettings.colorScheme === 'confidence' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-xs text-gray-600">High Confidence</span>
                <div className="w-4 h-4 bg-blue-300 rounded"></div>
                <span className="text-xs text-gray-600">Low Confidence</span>
              </div>
            )}
            
            {localSettings.colorScheme === 'value' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">High Q-Value</span>
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Low Q-Value</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">Best Action</span>
            </div>
          </div>
          
          <div className="text-sm text-green-700">
            Threshold: {(localSettings.minConfidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyArrows;