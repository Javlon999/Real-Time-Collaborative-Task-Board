/**
 * SortableTaskCard — thin wrapper that connects @dnd-kit's useSortable
 * to the presentational TaskCard component.
 *
 * Separation of concerns:
 *  - KanbanColumn owns: virtualizer position (translateY, measureElement)
 *  - SortableTaskCard owns: drag transform (CSS.Transform), setNodeRef, listeners
 *  - TaskCard owns: pure visual presentation
 *
 * The drag transform applied here is separate from the virtualizer's translateY.
 * Both are CSS transforms — the browser composites them on the GPU with no layout cost.
 *
 * CLAUDE.md rule: CSS `transition: transform 150ms ease` only — no Framer Motion on cards.
 *
 * Accessibility note:
 *  - dnd-kit's {...attributes} injects tabIndex, role="button", and aria-roledescription="sortable"
 *    on this wrapper div. TaskCard therefore uses isInteractive={false} so it does NOT
 *    re-declare tabIndex/role, avoiding a double tab stop per card.
 *  - The openModal click handler and Enter/Space keydown from dnd-kit listeners both
 *    work through this single focusable wrapper.
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store'
import { TaskCard } from './TaskCard'

interface SortableTaskCardProps {
  taskId: string
}

export function SortableTaskCard({ taskId }: SortableTaskCardProps) {
  const openModal = useStore((s) => s.openModal)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskId })

  return (
    <div
      ref={setNodeRef}
      // Merge the dnd-kit transform with the CSS transition.
      // When isDragging: transition is null (dnd-kit disables it during drag
      // to avoid fighting pointer position). When released: transition animates
      // the card back/to its new position smoothly.
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        // Reduce z-index when not dragging so the overlay renders on top
        zIndex: isDragging ? 1 : undefined,
      }}
      // dnd-kit injects: tabIndex, role="button", aria-roledescription="sortable"
      {...attributes}
      // dnd-kit injects: onKeyDown (Space/Enter/arrows for keyboard drag)
      {...listeners}
      // Open the edit modal on Enter/Space when not in a drag gesture.
      // dnd-kit's keyboard sensor handles drag via Space; we intercept Enter
      // here (which dnd-kit does not use) for a direct open-modal shortcut.
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e)
        if (e.key === 'Enter' && !e.defaultPrevented) {
          e.preventDefault()
          openModal(taskId)
        }
      }}
    >
      {/*
       * isInteractive={false} — suppresses the inner article's tabIndex/role/onKeyDown
       * since this wrapper div already owns those via dnd-kit's {...attributes}/{...listeners}.
       * Prevents a double tab stop (one per card instead of two).
       */}
      <TaskCard
        taskId={taskId}
        isDragging={isDragging}
        isInteractive={false}
      />
    </div>
  )
}
