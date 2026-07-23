/**
 * useRealtimeSimulator — simulates external user activity on the board.
 *
 * When isSimulatorActive is true, fires a random task mutation every 10–15s.
 * Each change is applied directly via applyExternalChange() (no optimistic flow —
 * external changes are treated as already-committed server events).
 *
 * Side effects per tick:
 *  1. Picks a random task + a random field change
 *  2. Calls applyExternalChange() to update the task in the store
 *  3. Fires an info toast: "Alice moved 'Task X' to Done"
 *  4. If the changed task's modal is currently open → fires a warning toast (conflict)
 *  5. Stores the change in realtimeSlice.lastExternalChange
 */

import { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import type { ExternalChange, Status, Priority } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

const SIMULATED_USERS = ['Alice', 'Bob', 'Carol', 'Dave'] as const

const ALL_STATUSES: Status[] = ['todo', 'in-progress', 'done']
const ALL_PRIORITIES: Priority[] = ['low', 'medium', 'high']

const MIN_DELAY_MS = 10_000
const MAX_DELAY_MS = 15_000

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
}

/**
 * Builds a random ExternalChange for the given task.
 * Always picks a value different from the current one so the change is visible.
 */
function buildRandomChange(
  taskId: string,
  taskTitle: string,
  currentStatus: Status,
  currentPriority: Priority,
  currentAssignee: string
): ExternalChange {
  const simulatedUser = randomItem(SIMULATED_USERS)

  // Randomly pick which field to change (weighted: status most interesting)
  const roll = Math.random()

  if (roll < 0.5) {
    // Change status (50% chance)
    const otherStatuses = ALL_STATUSES.filter((s) => s !== currentStatus)
    const newStatus = randomItem(otherStatuses)
    return {
      taskId,
      taskTitle,
      field: 'status',
      newValue: newStatus,
      simulatedUser,
      timestamp: Date.now(),
    }
  } else if (roll < 0.75) {
    // Change priority (25% chance)
    const otherPriorities = ALL_PRIORITIES.filter((p) => p !== currentPriority)
    const newPriority = randomItem(otherPriorities)
    return {
      taskId,
      taskTitle,
      field: 'priority',
      newValue: newPriority,
      simulatedUser,
      timestamp: Date.now(),
    }
  } else {
    // Change assignee (25% chance)
    const otherUsers = SIMULATED_USERS.filter((u) => u !== currentAssignee)
    const newAssignee = randomItem(otherUsers.length > 0 ? otherUsers : SIMULATED_USERS)
    return {
      taskId,
      taskTitle,
      field: 'assignee',
      newValue: newAssignee,
      simulatedUser,
      timestamp: Date.now(),
    }
  }
}

/** Produces a human-readable description of the change for the toast. */
function changeDescription(change: ExternalChange): string {
  if (change.field === 'status') {
    const labels: Record<string, string> = {
      todo: 'To Do',
      'in-progress': 'In Progress',
      done: 'Done',
    }
    return `moved "${change.taskTitle}" to ${labels[change.newValue as string] ?? change.newValue}`
  }
  if (change.field === 'priority') {
    return `changed priority of "${change.taskTitle}" to ${change.newValue}`
  }
  if (change.field === 'assignee') {
    return `reassigned "${change.taskTitle}" to ${change.newValue}`
  }
  return `updated "${change.taskTitle}"`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeSimulator() {
  const isSimulatorActive = useStore((s) => s.isSimulatorActive)
  const applyExternalChange = useStore((s) => s.applyExternalChange)
  const setLastExternalChange = useStore((s) => s.setLastExternalChange)
  const addToast = useStore((s) => s.addToast)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isSimulatorActive) return

    const scheduleNext = () => {
      timerRef.current = setTimeout(() => {
        // Read latest state at tick time (not stale closure)
        const state = useStore.getState()
        const taskIds = Object.keys(state.tasks)

        if (taskIds.length === 0) {
          scheduleNext()
          return
        }

        const randomTaskId = randomItem(taskIds)
        const task = state.tasks[randomTaskId]
        if (!task) {
          scheduleNext()
          return
        }

        // Build and apply the change
        const change = buildRandomChange(
          task.id,
          task.title,
          task.status,
          task.priority,
          task.assignee
        )

        applyExternalChange(change)
        setLastExternalChange(change)

        // Info toast — "Alice moved 'X' to Done"
        addToast({
          type: 'info',
          title: `${change.simulatedUser} ${changeDescription(change)}`,
          durationMs: 4000,
        })

        // Conflict detection — modal is open for the task that just changed
        if (state.openModalId === randomTaskId) {
          addToast({
            type: 'warning',
            title: 'Conflict detected',
            description: `${change.simulatedUser} just updated this task while you have it open.`,
            durationMs: 6000,
          })
        }

        scheduleNext()
      }, randomDelay())
    }

    scheduleNext()

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isSimulatorActive, applyExternalChange, setLastExternalChange, addToast])
}
