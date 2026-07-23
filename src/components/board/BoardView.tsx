import { DndContext } from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { BoardDragOverlay } from './BoardDragOverlay'
import { useFilteredTasks, COLUMN_CONFIG } from '@/hooks/useFilteredTasks'
import { useStore } from '@/store'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import type { Status } from '@/types'

// Human-readable column names used in screen reader announcements
const COLUMN_LABEL: Record<Status, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
}

/**
 * BoardView — root kanban layout.
 *
 * Renders 3 columns side by side in a responsive CSS grid:
 *  - Each column gets 1/3 of the available width
 *  - On narrow screens (<= md) columns stack vertically
 *  - Columns themselves do NOT scroll — only the card list inside each column scrolls
 *
 * Phase 3: wraps all columns in a DndContext so @dnd-kit sensors and
 * collision detection work. useDragAndDrop provides all event handlers
 * so this component stays a pure layout component.
 *
 * Accessibility: DndContext receives an `accessibility.announcements` object so
 * screen readers hear meaningful messages when a keyboard drag starts, moves over
 * a column, is dropped, or is cancelled.
 */
export function BoardView() {
  const { taskIdsByColumn } = useFilteredTasks()
  const draggingId = useStore((s) => s.draggingId)
  const tasks = useStore((s) => s.tasks)

  const {
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop()

  return (
    /*
     * Full viewport height minus the header/filter bar.
     * `min-h-0` is crucial — allows flex children to shrink below their content size,
     * which is required for the inner scroll to work correctly.
     */
    <div className="flex-1 min-h-0 p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          announcements: {
            onDragStart({ active }) {
              const title = tasks[String(active.id)]?.title ?? 'task'
              return `Picked up "${title}". Use arrow keys to move between columns, Space to drop, Escape to cancel.`
            },
            onDragOver({ active, over }) {
              if (!over) return
              const title = tasks[String(active.id)]?.title ?? 'task'
              const overId = String(over.id)
              const dest = COLUMN_LABEL[overId as Status] ?? tasks[overId]?.status
                ? COLUMN_LABEL[tasks[overId]?.status as Status]
                : overId
              return `"${title}" is over ${dest}.`
            },
            onDragEnd({ active, over }) {
              const title = tasks[String(active.id)]?.title ?? 'task'
              if (!over) return `"${title}" was dropped and returned to its original position.`
              const overId = String(over.id)
              const dest = COLUMN_LABEL[overId as Status] ?? (
                tasks[overId] ? COLUMN_LABEL[tasks[overId].status] : overId
              )
              return `"${title}" was dropped into ${dest}.`
            },
            onDragCancel({ active }) {
              const title = tasks[String(active.id)]?.title ?? 'task'
              return `Drag cancelled. "${title}" was returned to its original position.`
            },
          },
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {COLUMN_CONFIG.map(({ status, label }) => (
            <KanbanColumn
              key={status}
              status={status}
              label={label}
              taskIds={taskIdsByColumn[status]}
            />
          ))}
        </div>

        {/* DragOverlay portal — renders floating card clone during drag */}
        <BoardDragOverlay activeTaskId={draggingId} />
      </DndContext>
    </div>
  )
}
