export default function DefenderUnitBuilderView() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Unit Builder Mode</h3>
        <p className="text-gray-400 mb-4">
          Unit Builder mode will be available after Phase 5.5 (Unit Data Layer & Upgrade System) is implemented.
        </p>
        
        <div className="space-y-2 text-sm text-gray-500">
          <p><strong>Coming Soon:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Faction selection dropdown</li>
            <li>Searchable unit combobox</li>
            <li>Auto-populated defense die, surge chart, and keywords from preset</li>
            <li>Upgrade slot selection</li>
            <li>Automatic cost calculation (base + upgrades)</li>
            <li>Editable situational inputs (Cover, Tokens, Guardian)</li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> Use Custom Pool mode for manual configuration while this feature is being developed.
          </p>
        </div>
      </div>
    </div>
  );
}
