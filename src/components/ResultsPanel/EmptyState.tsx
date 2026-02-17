export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl">🎲</div>
      <h3 className="mt-3 text-lg font-semibold text-gray-300">
        No Results Yet
      </h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Configure your attack and defense, then click <strong>Run Simulation</strong> to see results.
      </p>
    </div>
  );
}
