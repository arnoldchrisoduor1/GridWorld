export const AnimationControls = () => {
  const { animationSettings, setAnimationSettings } = useAnimations();

  return (
    <AnimatedPanel isVisible={true} title="Animation Settings" className="p-4">
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={animationSettings.enableAnimations}
            onChange={(e) => setAnimationSettings(prev => ({
              ...prev,
              enableAnimations: e.target.checked
            }))}
          />
          <span>Enable Animations</span>
        </label>
        
        <div>
          <label className="block text-sm font-medium mb-2">Animation Speed</label>
          <select
            value={animationSettings.animationSpeed}
            onChange={(e) => setAnimationSettings(prev => ({
              ...prev,
              animationSpeed: e.target.value
            }))}
            className="w-full p-2 border rounded"
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
            <option value="instant">Instant</option>
          </select>
        </div>
      </div>
    </AnimatedPanel>
  );
};