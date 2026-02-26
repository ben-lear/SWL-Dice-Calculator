import { useState } from 'react';
import { useListStore } from '../../stores/listStore';

/**
 * JSON import section — textarea for pasting army list JSON,
 * or a summary bar after successful import.
 */
export default function JsonImportSection() {
  const { resolvedList, parseError, importList, clearList } = useListStore();
  const [inputValue, setInputValue] = useState('');

  const handleImport = () => {
    if (inputValue.trim()) {
      importList(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleImport();
    }
  };

  // Post-import: summary bar
  if (resolvedList) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
        <span className="text-sm font-semibold text-gray-100">
          {resolvedList.meta.name} — {resolvedList.meta.points}pts
        </span>
        <button
          onClick={() => {
            clearList();
            setInputValue('');
          }}
          className="ml-2 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
          aria-label="Clear imported list"
        >
          ✕ Clear
        </button>
      </div>
    );
  }

  // Pre-import: textarea + button
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
        <label htmlFor="list-json-input" className="mb-2 block text-xs text-gray-400">
          Paste your army list JSON from Tabletop Admiral, Legion HQ, or any compatible list builder
        </label>
        <textarea
          id="list-json-input"
          rows={6}
          className="w-full resize-y rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder='{"units": [{"name": "Stormtroopers", "upgrades": [...]}], ...}'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleImport}
          disabled={!inputValue.trim()}
          className="mt-2 w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import List
        </button>
      </div>
      {parseError && (
        <p className="text-sm text-red-400" role="alert">
          {parseError}
        </p>
      )}
    </div>
  );
}
