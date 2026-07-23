/**
 * BoardDragOverlay — floating card clone rendered during a drag.
 *
 * Uses @dnd-kit's DragOverlay which renders into a portal at the body level.
 * This means the source card in the virtualized list can safely unmount
 * while the user is dragging — the overlay keeps the visual alive.
 *
 * CLAUDE.md rules applied:
 *  - dropAnimation: null → let CSS handle the return animation, no JS
 *  - Framer Motion IS permitted here (single element, never 1000 cards)
 *  - The overlay card gets a slight rotation + shadow to feel "lifted"
 */

import { DragOverlay } from '@dnd-kit/core'
import { TaskCard } from '@/components/task/TaskCard'

interface BoardDragOverlayProps {
  /** The task id currently being dragged, or null */
  activeTaskId: string | null
}

export function BoardDragOverlay({ activeTaskId }: BoardDragOverlayProps) {
  return (
    <DragOverlay
      // null = no JS drop animation — the card snaps to its final position
      // instantly. The SortableTaskCard's CSS transition handles the smooth settle.
      dropAnimation={null}
    >
      {activeTaskId ? (
        <div className="rotate-1 opacity-95 shadow-2xl w-full">
          <TaskCard taskId={activeTaskId} />
        </div>
      ) : null}
    </DragOverlay>
  )
}
