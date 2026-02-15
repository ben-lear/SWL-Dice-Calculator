import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import DefenderCustomPoolView from './DefenderCustomPoolView';
import DefenderUnitBuilderView from './DefenderUnitBuilderView';

export default function DefenderPanel() {
  const { activeMode, setActiveMode } = useDefenseConfigStore();

  return (
    <div className="defender-panel border border-gray-700 rounded-lg p-4 bg-gray-900">
      <h2 className="text-xl font-bold mb-4">Defender</h2>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded transition-colors ${
            activeMode === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveMode('custom')}
        >
          Custom Pool
        </button>
        <button
          className={`px-4 py-2 rounded transition-colors ${
            activeMode === 'unit-builder'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveMode('unit-builder')}
        >
          Unit Builder
        </button>
      </div>

      {/* Conditional View */}
      {activeMode === 'custom' && <DefenderCustomPoolView />}
      {activeMode === 'unit-builder' && <DefenderUnitBuilderView />}
    </div>
  );
}
