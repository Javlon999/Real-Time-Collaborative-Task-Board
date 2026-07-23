import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import { SortableTaskCard } from '@/components/task/SortableTaskCard'
import { cn } from '@/lib/utils'
import type { Status } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: Status
  label: string
  taskIds: string[]
}

// ─── Column header colours ────────────────────────────────────────────────────

const COLUMN_ACCENT: Record<Status, string> = {
  'todo': 'border-t-slate-400',
  'in-progress': 'border-t-blue-500',
  'done': 'border-t-emerald-500',
}

const COLUMN_COUNT_BADGE: Record<Status, string> = {
  'todo': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500',
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * KanbanColumn — single status column with TanStack Virtual + @dnd-kit.
 *
 * Three layers of positioning work together:
 *  1. useDroppable({ id: status }) — makes the entire column a drop target,
 *     so cards can be dropped onto empty columns or the column background.
 *  2. SortableContext(taskIds) — tells @dnd-kit the order of sortable items
 *     so it can calculate displacement and emit correct drag-end data.
 *  3. useVirtualizer — renders only ~15 DOM nodes regardless of task count.
 *
 * Virtualizer rules (CLAUDE.md §3):
 *  - ref={parentRef} on the scrollable container
 *  - getTotalSize() sets the inner container height (total scroll range)
 *  - Each virtual row: position absolute + translateY, NO height property
 *  - data-index + ref={virtualizer.measureElement} for dynamic height measurement
 *  - overscan: 5 → 15 during active drag (keeps drop targets mounted)
 */
export function KanbanColumn({ status, label, taskIds }: KanbanColumnProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const draggingId = useStore((s) => s.draggingId)
  const openModal = useStore((s) => s.openModal)
  const isDragging = draggingId !== null

  // Make the whole column a drop target — handles drops on empty column space
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: status })

  const virtualizer = useVirtualizer({
    count: taskIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 130,
    // More overscan during drag — keeps off-screen cards mounted as drop targets
    overscan: isDragging ? 15 : 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Column header ── */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2.5 mb-2',
          'border border-border rounded-t-lg bg-card',
          'border-t-4',
          COLUMN_ACCENT[status]
        )}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <span
            className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded-full',
              COLUMN_COUNT_BADGE[status]
            )}
            aria-label={`${taskIds.length} tasks`}
          >
            {taskIds.length}
          </span>
        </div>

        <button
          onClick={() => openModal('new')}
          className={cn(
            'p-1 rounded-md text-muted-foreground',
            'hover:text-foreground hover:bg-accent',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={`Add task to ${label}`}
          title={`Add task to ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable virtualised task list ── */}
      {/*
       * Two refs on the same div:
       *  - parentRef → TanStack Virtual scroll container
       *  - setDropRef → @dnd-kit droppable (so empty column space accepts drops)
       */}
      <div
        ref={(node) => {
          // Merge both refs on the same element
          parentRef.current = node
          setDropRef(node)
        }}
        className={cn(
          'flex-1 overflow-y-auto min-h-0',
          'rounded-b-lg border border-t-0 border-border',
          // Highlight column when a card is being dragged over it
          isOver ? 'bg-accent/40' : 'bg-muted/20',
          'transition-colors duration-150',
        )}
        role="region"
        aria-label={`${label} column`}
      >
        {/*
         * SortableContext: tells @dnd-kit which items are in this column and
         * their current order. verticalListSortingStrategy calculates correct
         * displacement animations for vertical lists.
         *
         * Important: taskIds must be the same sorted array used to render
         * virtual items — order must be consistent.
         */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.length === 0 ? (
            <div className={cn(
              'flex flex-col items-center justify-center h-32',
              'text-muted-foreground text-sm gap-1',
              isOver && 'text-primary'
            )}>
              <span className="text-2xl opacity-30">{isOver ? '↓' : '○'}</span>
              <span>{isOver ? 'Drop here' : 'No tasks'}</span>
            </div>
          ) : (
            /*
             * Total-size container — height = sum of all virtual row heights.
             * Creates the correct scrollbar range for the full list.
             *
             * role="list" — tells screen readers this is a list so they announce
             * "list, N items" when focus enters, giving keyboard users positional context.
             */
            <div
              role="list"
              aria-label={`${label} tasks`}
              style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
              className="px-2 py-2"
            >
              {virtualItems.map((vItem) => {
                const taskId = taskIds[vItem.index]

                return (
                  /*
                   * Virtualizer row wrapper — CLAUDE.md §3 exact pattern:
                   *  ✓ key = stable task id (never vItem.index)
                   *  ✓ data-index = vItem.index (required by measureElement)
                   *  ✓ ref = virtualizer.measureElement (auto-measures height)
                   *  ✓ position: absolute + translateY — NO height property
                   *
                   * role="listitem" — pairs with role="list" above so screen readers
                   * announce "1 of 30", "2 of 30" etc. as the user moves through cards.
                   */
                  <div
                    key={taskId}
                    role="listitem"
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vItem.start}px)`,
                      // NO height here — let SortableTaskCard/TaskCard define it
                    }}
                    className="pb-2"
                  >
                    <SortableTaskCard taskId={taskId} />
                  </div>
                )
              })}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}
