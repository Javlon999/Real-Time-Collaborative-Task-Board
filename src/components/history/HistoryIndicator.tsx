/**
 * HistoryIndicator — shows the label of the most recent undoable action
 * and, when available, the next redoable action.
 *
 * Renders two lines of muted text beside the Undo/Redo buttons:
 *   "↩ Moved 'Fix login bug' to In Progress"   ← last undo
 *   "↪ Deleted 'Old task'"                      ← next redo (only when present)
 *
 * Renders nothing when there is nothing to undo or redo.
 */

import { useShallow } from 'zustand/shallow'
import { useStore } from '@/store'
import { selectUndoRedo } from '@/store/selectors'

export function HistoryIndicator() {
  const { canUndo, canRedo, undoLabel, redoLabel } = useStore(useShallow(selectUndoRedo))

  if (!canUndo && !canRedo) return null

  return (
    <div
      className="flex flex-col gap-0.5"
      aria-live="polite"
      aria-atomic="true"
    >
      {canUndo && undoLabel && (
        <p
          className="text-[10px] text-muted-foreground truncate max-w-[180px]"
          title={`Undo: ${undoLabel}`}
          aria-label={`Last undoable action: ${undoLabel}`}
        >
          ↩ {undoLabel}
        </p>
      )}
      {canRedo && redoLabel && (
        <p
          className="text-[10px] text-muted-foreground/60 truncate max-w-[180px]"
          title={`Redo: ${redoLabel}`}
          aria-label={`Next redoable action: ${redoLabel}`}
        >
          ↪ {redoLabel}
        </p>
      )}
    </div>
  )
}
