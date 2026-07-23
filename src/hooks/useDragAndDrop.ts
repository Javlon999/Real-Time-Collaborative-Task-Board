/**
 * useDragAndDrop — all @dnd-kit logic for the kanban board.
 *
 * Isolated in a hook so BoardView stays a pure layout component.
 *
 * Responsibilities:
 *  - Configure sensors (pointer + keyboard, with 8px activation distance)
 *  - Handle onDragStart / onDragEnd / onDragCancel
 *  - Calculate new column (status) and order on drop
 *  - Full Phase 5 optimistic flow:
 *      optimisticMove → setLoading → api.moveTask()
 *        SUCCESS → commitOptimistic + pushHistory + success toast
 *        FAILURE → rollbackOptimistic + error toast
 *
 * Order calculation on drop:
 *  - Dropped on empty column          → 1000
 *  - Dropped below all cards          → maxOrder + 1000
 *  - Dropped between card A and B     → Math.round((A.order + B.order) / 2)
 *  - Dropped as first card            → firstCard.order - 500  (min 500)
 */

import { useCallback } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import type { Status } from '@/types'

const VALID_STATUSES: Status[] = ['todo', 'in-progress', 'done']

const STATUS_LABELS: Record<Status, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
}

function isValidStatus(value: unknown): value is Status {
  return VALID_STATUSES.includes(value as Status)
}

export function useDragAndDrop() {
  const tasks = useStore((s) => s.tasks)
  const optimisticMove = useStore((s) => s.optimisticMove)
  const commitOptimistic = useStore((s) => s.commitOptimistic)
  const rollbackOptimistic = useStore((s) => s.rollbackOptimistic)
  const restoreSnapshot = useStore((s) => s.restoreSnapshot)
  const setDragging = useStore((s) => s.setDragging)
  const setLoading = useStore((s) => s.setLoading)
  const loadingIds = useStore((s) => s.loadingIds)
  const pushHistory = useStore((s) => s.pushHistory)
  const addToast = useStore((s) => s.addToast)

  // ── Sensors ──────────────────────────────────────────────────────────────
  // PointerSensor: requires 8px movement before drag activates.
  //   Prevents accidental drags when clicking to open the modal.
  // KeyboardSensor: built-in keyboard DnD accessibility (do not disable).
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ── onDragStart ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragging(String(event.active.id))
  }, [setDragging])

  // ── onDragEnd ─────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setDragging(null)

    if (!over) return // dropped outside any droppable — no-op

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) return // dropped on itself — no-op

    const activeTask = tasks[activeId]
    if (!activeTask) return

    // ── Option B: in-flight guard ─────────────────────────────────────────
    // If this card already has an API call in-flight (e.g. a previous drag
    // hasn't resolved yet), block the new drag entirely. This prevents two
    // concurrent ops on the same task from corrupting the shared _snapshot slot.
    if (loadingIds.has(activeId)) {
      addToast({
        type: 'warning',
        title: 'Please wait',
        description: 'This card is still saving. Try again in a moment.',
      })
      return
    }

    // Determine the target column.
    // `over.id` is either:
    //   a) a column status string ('todo' | 'in-progress' | 'done')  — dropped on empty column area
    //   b) a task id string                                           — dropped on/near another card
    let targetStatus: Status
    let overTaskId: string | null = null

    if (isValidStatus(overId)) {
      // Case (a): dropped directly on a column droppable
      targetStatus = overId
    } else {
      // Case (b): dropped on a task — infer column from that task
      const overTask = tasks[overId]
      if (!overTask) return
      targetStatus = overTask.status
      overTaskId = overId
    }

    // ── Calculate new order ──────────────────────────────────────────────
    // Get all tasks in the target column sorted by order, excluding the dragged task.
    const columnTasks = Object.values(tasks)
      .filter((t) => t.status === targetStatus && t.id !== activeId)
      .sort((a, b) => a.order - b.order)

    let newOrder: number

    if (columnTasks.length === 0) {
      // Dropped into an empty column
      newOrder = 1000
    } else if (!overTaskId || isValidStatus(overId)) {
      // Dropped on the column itself (not on a specific task) → append at end
      newOrder = columnTasks[columnTasks.length - 1].order + 1000
    } else {
      // Dropped on a specific task — calculate midpoint
      const overIndex = columnTasks.findIndex((t) => t.id === overTaskId)

      if (overIndex === -1) {
        // overTask not found after filtering — append
        newOrder = columnTasks[columnTasks.length - 1].order + 1000
      } else {
        const above = columnTasks[overIndex - 1]
        const below = columnTasks[overIndex]

        if (!above) {
          // Dropped before the first card
          newOrder = Math.max(500, below.order - 500)
        } else if (!below) {
          // Dropped after the last card
          newOrder = above.order + 1000
        } else {
          // Dropped between two cards — midpoint
          newOrder = Math.round((above.order + below.order) / 2)
        }
      }
    }

    // ── Phase 5: optimistic → API → commit/rollback ──────────────────────
    // Capture snapshot BEFORE optimisticMove mutates state.
    const snapshotBefore = structuredClone(useStore.getState().tasks)
    const taskTitle = activeTask.title

    // 1. Apply the move to the UI instantly (saves _snapshot internally).
    optimisticMove(activeId, targetStatus, newOrder)

    // 2. Mark the card as loading (shows optimistic ring + AlertCircle).
    setLoading(activeId, true)

    // 3. Fire the API call asynchronously — do NOT await here (handleDragEnd
    //    must return synchronously so dnd-kit can clean up the drag session).
    void (async () => {
      try {
        await api.moveTask(activeId, { status: targetStatus, order: newOrder })

        // SUCCESS — confirm the optimistic change
        commitOptimistic()
        pushHistory({
          type: 'MOVE',
          label: `Moved '${taskTitle}' to ${STATUS_LABELS[targetStatus]}`,
          snapshot: snapshotBefore,
        })
        addToast({
          type: 'success',
          title: 'Task moved',
          description: `'${taskTitle}' → ${STATUS_LABELS[targetStatus]}`,
        })
      } catch {
        // Option A safety net: restore from THIS closure's own snapshot.
        // Even if another drag fired concurrently and overwrote _snapshot,
        // this closure's snapshotBefore is still the correct pre-move state.
        restoreSnapshot(snapshotBefore)
        addToast({
          type: 'error',
          title: 'Failed to move task',
          description: 'The card was returned to its previous position.',
        })
      } finally {
        setLoading(activeId, false)
      }
    })()

  }, [tasks, optimisticMove, commitOptimistic, restoreSnapshot, setDragging, setLoading, loadingIds, pushHistory, addToast])

  // ── onDragCancel ──────────────────────────────────────────────────────────
  const handleDragCancel = useCallback(() => {
    setDragging(null)
    // No optimisticMove was called yet when a drag is cancelled mid-gesture,
    // so rollbackOptimistic is a safe no-op here.
    rollbackOptimistic()
  }, [setDragging, rollbackOptimistic])

  return {
    sensors,
    collisionDetection: closestCenter,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
