/**
 * Memoized selectors for the Zustand store.
 *
 * These are used with useShallow() to prevent unnecessary component re-renders.
 * Import and use these in components instead of writing inline selectors.
 *
 * Pattern:
 *   const tasks = useStore(useShallow(selectTasksByStatus('todo')))
 */

import type { RootStore } from '@/store'
import type { Status, Task } from '@/types'

/** Returns all tasks as an array */
export const selectAllTasks = (s: RootStore): Task[] =>
  Object.values(s.tasks)

/** Returns tasks for a specific status column, sorted by order */
export const selectTasksByStatus =
  (status: Status) =>
  (s: RootStore): Task[] =>
    Object.values(s.tasks)
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order)

/** Returns unique assignees across all tasks */
export const selectAssignees = (s: RootStore): string[] =>
  [...new Set(Object.values(s.tasks).map((t) => t.assignee))].sort()

/** Returns unique tags across all tasks */
export const selectAllTags = (s: RootStore): string[] =>
  [...new Set(Object.values(s.tasks).flatMap((t) => t.tags))].sort()

/** Returns count of tasks per status */
export const selectColumnCounts = (
  s: RootStore
): Record<Status, number> => {
  const counts: Record<Status, number> = { todo: 0, 'in-progress': 0, done: 0 }
  Object.values(s.tasks).forEach((t) => {
    counts[t.status]++
  })
  return counts
}

/** Returns true if a specific task is currently loading (API in flight) */
export const selectIsTaskLoading =
  (taskId: string) =>
  (s: RootStore): boolean =>
    s.loadingIds.has(taskId)

/** Returns the current filter state */
export const selectFilters = (s: RootStore) => s.filters

/** Returns undo/redo availability and labels */
export const selectUndoRedo = (s: RootStore) => ({
  canUndo: s.past.length > 0,
  canRedo: s.future.length > 0,
  undoLabel: s.past.length > 0 ? s.past[s.past.length - 1].label : undefined,
  redoLabel: s.future.length > 0 ? s.future[s.future.length - 1].label : undefined,
})
