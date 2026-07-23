import { memo } from 'react'
import { useShallow } from 'zustand/shallow'
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Tag,
  User,
} from 'lucide-react'
import { useStore } from '@/store'
import { cn, formatDate } from '@/lib/utils'
import type { Priority } from '@/types'

// ─── Priority config ──────────────────────────────────────────────────────────
// Color is NEVER the only signal — we always pair it with an icon + label
// per the accessibility rule in CLAUDE.md.

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; icon: React.ReactNode; classes: string }
> = {
  low: {
    label: 'Low',
    icon: <ArrowDown className="h-3 w-3" />,
    classes: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  medium: {
    label: 'Medium',
    icon: <ArrowRight className="h-3 w-3" />,
    classes: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  high: {
    label: 'High',
    icon: <ArrowUp className="h-3 w-3" />,
    classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  taskId: string
  /** Passed by @dnd-kit when this card is being dragged — applies ghost opacity */
  isDragging?: boolean
  /** Extra class names from the virtualizer row wrapper */
  className?: string
  /**
   * When true (default), the card is independently focusable and handles its own
   * keyboard events. Set to false when rendered inside SortableTaskCard, which
   * already injects tabIndex, role, and keyboard listeners via dnd-kit's
   * {...attributes} and {...listeners} — prevents a double tab stop per card.
   */
  isInteractive?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TaskCard — the individual card rendered inside each KanbanColumn.
 *
 * Performance contracts (from CLAUDE.md):
 *  - Wrapped in React.memo — will NOT re-render if taskId and isDragging are stable
 *  - Uses a stable selector `s.tasks[taskId]` with useShallow — subscribes only
 *    to the specific task object, not the entire tasks map
 *  - Does NOT spread the task into a new object (would break shallow equality)
 *
 * @dnd-kit integration note:
 *  - The drag listeners / attributes / ref are attached in KanbanColumn via useSortable
 *  - TaskCard itself is a pure presentational component in Phase 2
 *  - Phase 3 will forward the sortable props via a wrapper
 */
export const TaskCard = memo(function TaskCard({
  taskId,
  isDragging = false,
  className,
  isInteractive = true,
}: TaskCardProps) {
  // ✓ Stable selector — only re-renders when THIS task's data changes
  const task = useStore(useShallow((s) => s.tasks[taskId]))
  const isLoading = useStore((s) => s.loadingIds.has(taskId))
  const openModal = useStore((s) => s.openModal)

  // Task may not exist briefly during optimistic delete
  if (!task) return null

  // NOTE: We do NOT replace the card with a skeleton when isLoading=true.
  // For drag moves, the card must remain visible at its optimistic position.
  // The _optimistic ring + pulse below is the loading indicator for all in-flight ops.
  // TaskCardSkeleton is kept as a standalone export for future use (e.g. initial load).

  const priority = PRIORITY_CONFIG[task.priority]

  return (
    <article
      className={cn(
        // Base card styles using semantic tokens only — no raw colors
        'group rounded-lg border border-border bg-card text-card-foreground',
        'p-3 space-y-2 cursor-pointer select-none',
        // Smooth CSS transition for drag transform — no JS animation
        'transition-shadow duration-150',
        'hover:shadow-md hover:border-border/80',
        // Optimistic / loading state — ring when pending, pulse when API is in-flight
        (task._optimistic || isLoading) && 'ring-1 ring-primary/40',
        isLoading && 'animate-pulse opacity-75',
        // Dragging state — ghost behind the DragOverlay
        isDragging && 'opacity-40 shadow-none',
        className
      )}
      onClick={() => openModal(taskId)}
      // Keyboard accessibility — only when not inside SortableTaskCard which
      // already injects its own tabIndex, role, and keydown via dnd-kit attributes.
      // Having both causes a double tab stop per card.
      {...(isInteractive ? {
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openModal(taskId)
          }
        },
        tabIndex: 0,
        role: 'button' as const,
      } : {})}
      aria-label={`Task: ${task.title}. Priority: ${priority.label}. Assignee: ${task.assignee}.${isInteractive ? ' Press Enter to edit.' : ''}`}
      aria-busy={isLoading || undefined}
    >
      {/* ── Title + optimistic indicator ── */}
      <div className="flex items-start gap-2">
        {task._optimistic && (
          <AlertCircle
            className="h-3.5 w-3.5 text-primary/60 mt-0.5 shrink-0"
            aria-label="Pending save"
          />
        )}
        <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2 flex-1">
          {task.title}
        </h3>
      </div>

      {/* ── Description (clamped to 2 lines) ── */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* ── Tags ── */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="Tags">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/50"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground px-1">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* ── Footer: priority + assignee + date ── */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Priority badge — icon + label so color is never the only signal */}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
            priority.classes
          )}
          aria-label={`Priority: ${priority.label}`}
        >
          {priority.icon}
          {priority.label}
        </span>

        {/* Assignee + date */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
          <span className="flex items-center gap-0.5 truncate max-w-[80px]" title={task.assignee}>
            <User className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{task.assignee.split(' ')[0]}</span>
          </span>
          <span className="flex items-center gap-0.5 shrink-0">
            <Calendar className="h-2.5 w-2.5" />
            {formatDate(task.createdAt)}
          </span>
        </div>
      </div>
    </article>
  )
})
