import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimationProvider } from './components/AnimationProvider.jsx';
import { AnimationControls } from './components/AnimatedControls.jsx';
import { AnimatedPanel } from './components/AnimatedPanel.jsx';
import GridWorld from './components/GridWorld.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import ParameterControls from './components/ParameterControls.jsx';
import MetricsPanel from './components/MetricsPanel.jsx';
import QValueHeatmap from './components/Visualizations/QValueHeatmap.jsx';
import PolicyArrows from './components/Visualizations/PolicyArrows.jsx';
import LearningChart from './components/Visualizations/LearningChart.jsx';
import { useGridWorld } from './hooks/useGridWorld.js';
import { useQLearning } from './hooks/useQLearning.js';
import { useTraining } from './hooks/useTraining.js';
import { Settings, Eye, BarChart3 } from 'lucide-react';

function App() {
  const [activePanel, setActivePanel] = useState('controls');
  const [showSettings, setShowSettings] = useState(false);

  // Main hooks
  const gridWorld = useGridWorld();
  const qLearning = useQLearning(gridWorld.gridSize);
  const training = useTraining(gridWorld, qLearning);

  // Panel animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <AnimationProvider>
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.header 
          className="bg-white shadow-sm border-b"
          variants={itemVariants}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <motion.h1 
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
              >
                RL Grid World
              </motion.h1>
              
              <div className="flex items-center gap-2">
                {/* Panel Navigation */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { id: 'controls', icon: Settings, label: 'Controls' },
                    { id: 'visualizations', icon: Eye, label: 'Visualizations' },
                    { id: 'metrics', icon: BarChart3, label: 'Metrics' }
                  ].map(({ id, icon: Icon, label }) => (
                    <motion.button
                      key={id}
                      onClick={() => setActivePanel(id)}
                      className={`px-3 py-2 rounded flex items-center gap-2 text-sm font-medium transition-all ${
                        activePanel === id 
                          ? 'bg-white shadow-sm text-blue-600' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon size={16} />
                      {label}
                    </motion.button>
                  ))}
                </div>

                {/* Settings Toggle */}
                <motion.button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Settings size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Grid World - Always Visible */}
            <motion.div 
              className="lg:col-span-2"
              variants={itemVariants}
            >
              <AnimatedPanel isVisible={true} title="Grid World Environment">
                <div className="p-4">
                  <GridWorld 
                    {...gridWorld}
                    qTable={qLearning.qTable}
                    policy={qLearning.policy}
                    isTraining={training.isTraining}
                    currentEpisode={training.currentEpisode}
                  />
                  
                  {/* Overlay Visualizations */}
                  <div className="relative mt-4">
                    <QValueHeatmap 
                      qTable={qLearning.qTable}
                      gridSize={gridWorld.gridSize}
                      visible={activePanel === 'visualizations'}
                    />
                    <PolicyArrows 
                      policy={qLearning.policy}
                      gridSize={gridWorld.gridSize}
                      visible={activePanel === 'visualizations'}
                    />
                  </div>
                </div>
              </AnimatedPanel>
            </motion.div>

            {/* Dynamic Side Panel */}
            <motion.div variants={itemVariants}>
              <AnimatePresence mode="wait">
                {activePanel === 'controls' && (
                  <motion.div
                    key="controls"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <ControlPanel {...training} />
                    <ParameterControls 
                      parameters={qLearning.parameters}
                      updateParameter={qLearning.updateParameter}
                      resetQTable={qLearning.resetQTable}
                    />
                  </motion.div>
                )}

                {activePanel === 'visualizations' && (
                  <motion.div
                    key="visualizations" 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <LearningChart 
                      trainingData={training.trainingHistory}
                      isTraining={training.isTraining}
                    />
                  </motion.div>
                )}

                {activePanel === 'metrics' && (
                  <motion.div
                    key="metrics"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <MetricsPanel 
                      trainingStats={training.statistics}
                      qLearningStats={qLearning.statistics}
                      isTraining={training.isTraining}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <AnimationControls />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Training Status Indicator */}
        <AnimatePresence>
          {training.isTraining && (
            <motion.div
              className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <motion.div
                className="w-2 h-2 bg-white rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              Training Episode {training.currentEpisode}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimationProvider>
  );
}

export default App;