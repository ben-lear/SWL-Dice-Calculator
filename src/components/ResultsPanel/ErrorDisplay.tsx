interface ErrorDisplayProps {
  message: string;
}

export default function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl">⚠️</div>
      <h3 className="mt-3 text-lg font-semibold text-red-400">
        Simulation Error
      </h3>
      <p className="mt-1 max-w-xs text-sm text-gray-400">
        {message}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Try adjusting your configuration to run a new simulation.
      </p>
    </div>
  );
}
