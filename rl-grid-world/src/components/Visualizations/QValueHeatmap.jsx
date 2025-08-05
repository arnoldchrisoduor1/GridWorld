import React, { useMemo, useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Palette, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ACTIONS, 
  ACTION_SYMBOLS,
  CELL_TYPES 
} from '../utils/constants.js';
import { stateToPosition, positionToState } from '../utils/gridUtils.js';

/**
 * Q-Value Heatmap Component - Visualizes Q-values with color coding
 */
const QValueHeatmap = ({ 
  qTable,
  grid,
  gridSize,
  startPos,
  goalPos,
  agentPos,
  isVisible = true,
  selectedAction = null,
  opacity = 0.7,
  showValues = false,
  showBestAction = true,
  colorScheme = 'blue-red',
  onToggleVisibility,
  onActionSelect,
  onSettingsChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    opacity,
    showValues,
    showBestAction,
    colorScheme,
    normalization: 'global', // 'global', 'local', 'none'
    precision: 2
  });

  // Calculate Q-value statistics for normalization
  const qValueStats = useMemo(() => {
    if (!qTable) return { min: 0, max: 1, range: 1 };
    
    let allValues = [];
    Object.values(qTable).forEach(stateActions => {
      Object.values(stateActions).forEach(value => {
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      });
    });
    
    if (allValues.length === 0) return { min: 0, max: 1, range: 1 };
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min || 1;
    
    return { min, max, range, mean: allValues.reduce((a, b) => a + b, 0) / allValues.length };
  }, [qTable]);

  // Get Q-values for a specific cell
  const getCellQValues = useCallback((row, col) => {
    if (!qTable) return {};
    
    const state = positionToState([row, col], gridSize);
    return qTable[state] || {};
  }, [qTable, gridSize]);

  // Get best action for a cell
  const getBestAction = useCallback((row, col) => {
    const qValues = getCellQValues(row, col);
    if (Object.keys(qValues).length === 0) return null;
    
    let bestAction = null;
    let bestValue = -Infinity;
    
    Object.entries(qValues).forEach(([action, value]) => {
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    });
    
    return bestAction;
  }, [getCellQValues]);

  // Normalize Q-value for color mapping
  const normalizeQValue = useCallback((value, row, col) => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    
    switch (localSettings.normalization) {
      case 'global':
        return (value - qValueStats.min) / qValueStats.range;
      case 'local':
        const cellQValues = Object.values(getCellQValues(row, col));
        if (cellQValues.length === 0) return 0;
        const cellMin = Math.min(...cellQValues);
        const cellMax = Math.max(...cellQValues);
        const cellRange = cellMax - cellMin || 1;
        return (value - cellMin) / cellRange;
      case 'none':
      default:
        return Math.max(0, Math.min(1, (value + 1) / 2)); // Assume values are roughly -1 to 1
    }
  }, [localSettings.normalization, qValueStats, getCellQValues]);

  // Get color for Q-value
  const getQValueColor = useCallback((value, row, col) => {
    const normalized = normalizeQValue(value, row, col);
    
    switch (localSettings.colorScheme) {
      case 'blue-red':
        const red = Math.round(255 * normalized);
        const blue = Math.round(255 * (1 - normalized));
        return `rgb(${red}, 0, ${blue})`;
      
      case 'green-red':
        const green = Math.round(255 * normalized);
        const redGR = Math.round(255 * (1 - normalized));
        return `rgb(${redGR}, ${green}, 0)`;
      
      case 'heatmap':
        // Blue -> Cyan -> Green -> Yellow -> Red
        const hue = (1 - normalized) * 240; // 240 = blue, 0 = red
        return `hsl(${hue}, 100%, 50%)`;
      
      case 'monochrome':
        const intensity = Math.round(255 * normalized);
        return `rgb(${intensity}, ${intensity}, ${intensity})`;
      
      default:
        return `rgba(59, 130, 246, ${normalized})`;
    }
  }, [normalizeQValue, localSettings.colorScheme]);

  // Get cell overlay content
  const getCellOverlay = useCallback((row, col) => {
    const cellType = grid[row][col];
    
    // Don't show overlay on walls
    if (cellType === CELL_TYPES.WALL) return null;
    
    const qValues = getCellQValues(row, col);
    const bestAction = getBestAction(row, col);
    
    // If showing specific action
    if (selectedAction && qValues[selectedAction] !== undefined) {
      const value = qValues[selectedAction];
      const color = getQValueColor(value, row, col);
      
      return (
        <div 
          className="absolute inset-0 flex items-center justify-center text-xs font-medium"
          style={{ 
            backgroundColor: color, 
            opacity: localSettings.opacity,
            color: normalizeQValue(value, row, col) > 0.5 ? 'white' : 'black'
          }}
        >
          {localSettings.showValues && (
            <span>{value.toFixed(localSettings.precision)}</span>
          )}
          <span className="ml-1">{ACTION_SYMBOLS[selectedAction]}</span>
        </div>
      );
    }
    
    // Show best action or overall value
    if (Object.keys(qValues).length === 0) return null;
    
    const maxValue = Math.max(...Object.values(qValues));
    const avgValue = Object.values(qValues).reduce((a, b) => a + b, 0) / Object.values(qValues).length;
    const displayValue = localSettings.showBestAction ? maxValue : avgValue;
    
    const color = getQValueColor(displayValue, row, col);
    
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center text-xs font-medium"
        style={{ 
          backgroundColor: color, 
          opacity: localSettings.opacity,
          color: normalizeQValue(displayValue, row, col) > 0.5 ? 'white' : 'black'
        }}
      >
        {localSettings.showValues && (
          <span>{displayValue.toFixed(localSettings.precision)}</span>
        )}
        {localSettings.showBestAction && bestAction && (
          <span className="text-lg leading-none">{ACTION_SYMBOLS[bestAction]}</span>
        )}
      </div>
    );
  }, [
    grid, 
    getCellQValues, 
    getBestAction, 
    selectedAction, 
    getQValueColor, 
    normalizeQValue,
    localSettings
  ]);

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
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Q-Value Heatmap</h3>
          </div>
          
          {/* Quick Action Selector */}
          <div className="flex gap-1 ml-4">
            <button
              onClick={() => onActionSelect?.(null)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                !selectedAction 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.keys(ACTIONS).map(action => (
              <button
                key={action}
                onClick={() => onActionSelect?.(action)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedAction === action
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ACTION_SYMBOLS[action]}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Heatmap Settings"
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
            {/* Opacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opacity
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localSettings.opacity}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{(localSettings.opacity * 100).toFixed(0)}%</span>
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
                <option value="blue-red">Blue → Red</option>
                <option value="green-red">Green → Red</option>
                <option value="heatmap">Rainbow Heatmap</option>
                <option value="monochrome">Monochrome</option>
              </select>
            </div>

            {/* Normalization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Normalization
              </label>
              <select
                value={localSettings.normalization}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, normalization: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="global">Global (All Q-values)</option>
                <option value="local">Local (Per Cell)</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* Precision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value Precision
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={localSettings.precision}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, precision: parseInt(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.showValues}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, showValues: e.target.checked }))}
                className="rounded"
              />
              Show Values
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.showBestAction}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, showBestAction: e.target.checked }))}
                className="rounded"
              />
              Show Best Action
            </label>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={applySettings}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Q-Value Statistics */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Min:</span>
            <span className="ml-1 font-medium">{qValueStats.min.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Max:</span>
            <span className="ml-1 font-medium">{qValueStats.max.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Range:</span>
            <span className="ml-1 font-medium">{qValueStats.range.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Mean:</span>
            <span className="ml-1 font-medium">{qValueStats.mean?.toFixed(2) || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Grid Overlay */}
      <div className="relative">
        <div 
          className="grid gap-0 border border-gray-300 bg-white rounded-lg overflow-hidden"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            aspectRatio: '1'
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square border border-gray-200"
              >
                {getCellOverlay(rowIndex, colIndex)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-xs text-gray-600">High Q-Value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-xs text-gray-600">Low Q-Value</span>
            </div>
            {localSettings.showBestAction && (
              <div className="flex items-center gap-2">
                <span className="text-lg">↑</span>
                <span className="text-xs text-gray-600">Best Action</span>
              </div>
            )}
          </div>
          
          {selectedAction && (
            <div className="text-sm text-blue-700">
              Showing: {selectedAction.toUpperCase()} {ACTION_SYMBOLS[selectedAction]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QValueHeatmap;