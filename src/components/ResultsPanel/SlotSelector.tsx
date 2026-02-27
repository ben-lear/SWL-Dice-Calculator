import { useState, useRef, useEffect } from 'react';
import type { ResultSlot } from '../../stores/resultsStore';

// ============================================================================
// Types
// ============================================================================

interface SlotSelectorProps {
  slots: ResultSlot[];
  viewedSlotId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
}

// ============================================================================
// Helper: Get Tailwind color classes for a slot
// ============================================================================

function getColorClasses(color: string, isActive: boolean): {
  dot: string;
  border: string;
  ring: string;
} {
  const dotClass = `bg-${color}-500`;
  
  if (isActive) {
    return {
      dot: dotClass,
      border: `border-${color}-500`,
      ring: `ring-1 ring-${color}-500/30`,
    };
  }
  
  return {
    dot: dotClass,
    border: 'border-gray-700 hover:border-gray-500',
    ring: '',
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * SlotSelector — Displays a horizontal row of slot "chips" for navigating
 * between multiple simulation results.
 *
 * Each chip shows:
 * - Color dot (indicates series color)
 * - Label (double-click to rename)
 * - × button (remove slot)
 *
 * The active (viewed) slot has a highlighted border in its assigned color.
 */
export function SlotSelector({
  slots,
  viewedSlotId,
  onSelect,
  onRemove,
  onRename,
}: SlotSelectorProps) {
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingSlotId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSlotId]);

  // Render nothing if no slots
  if (slots.length === 0) {
    return null;
  }

  const handleDoubleClick = (slot: ResultSlot) => {
    setEditingSlotId(slot.id);
    setEditLabel(slot.label);
  };

  const handleConfirmRename = (id: string) => {
    if (editLabel.trim()) {
      onRename(id, editLabel.trim());
    }
    setEditingSlotId(null);
  };

  const handleCancelRename = () => {
    setEditingSlotId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleConfirmRename(id);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {slots.map((slot) => {
        const isActive = slot.id === viewedSlotId;
        const isEditing = slot.id === editingSlotId;
        const colorClasses = getColorClasses(slot.color, isActive);

        return (
          <div
            key={slot.id}
            role="button"
            tabIndex={0}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm bg-gray-800 border cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${colorClasses.border} ${colorClasses.ring}`}
            onClick={() => !isEditing && onSelect(slot.id)}
            onKeyDown={(e) => {
              if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(slot.id);
              }
            }}
          >
            {/* Color dot */}
            <div className={`w-3 h-3 rounded-full ${colorClasses.dot}`} />

            {/* Label or input */}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, slot.id)}
                onBlur={() => handleConfirmRename(slot.id)}
                className="bg-gray-700 text-white text-sm px-1 py-0.5 rounded outline-none w-20"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-gray-100 select-none"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(slot);
                }}
              >
                {slot.label}
              </span>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(slot.id);
              }}
              className="text-gray-400 hover:text-red-400 transition-colors ml-1"
              aria-label={`Remove ${slot.label}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
