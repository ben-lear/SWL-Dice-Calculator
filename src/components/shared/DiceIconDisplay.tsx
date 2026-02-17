interface DiceIconDisplayProps {
  redDice: number;
  blackDice: number;
  whiteDice: number;
}

/**
 * Displays dice counts using colored diamond icons.
 * Used in unit builder mode for visual clarity.
 */
export default function DiceIconDisplay({
  redDice,
  blackDice,
  whiteDice,
}: DiceIconDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      {redDice > 0 && (
        <div className="flex items-center gap-1">
          {Array.from({ length: redDice }).map((_, i) => (
            <div
              key={`red-${i}`}
              className="h-3.5 w-3.5 rotate-45 bg-red-500 ring-2 ring-red-600"
              title={`Red die ${i + 1}`}
            />
          ))}
        </div>
      )}
      {blackDice > 0 && (
        <div className="flex items-center gap-1">
          {Array.from({ length: blackDice }).map((_, i) => (
            <div
              key={`black-${i}`}
              className="h-3.5 w-3.5 rotate-45 bg-gray-900 ring-2 ring-gray-600"
              title={`Black die ${i + 1}`}
            />
          ))}
        </div>
      )}
      {whiteDice > 0 && (
        <div className="flex items-center gap-1">
          {Array.from({ length: whiteDice }).map((_, i) => (
            <div
              key={`white-${i}`}
              className="h-3.5 w-3.5 rotate-45 bg-gray-100 ring-2 ring-gray-300"
              title={`White die ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
