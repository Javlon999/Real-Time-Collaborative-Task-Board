import { useMemo } from 'react'
import { useShallow } from 'zustand/shallow'
import { useStore } from '@/store'
import type { Status, Task, FilterState } from '@/types'

// ─── Column order ────────────────────────────────────────────────────────────

export const COLUMN_CONFIG: { status: Status; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

// ─── Core filter predicate ────────────────────────────────────────────────────

/**
 * Returns true if a task matches ALL active filters simultaneously (AND logic).
 * Search is case-insensitive and matches title OR description.
 */
export function taskMatchesFilters(task: Task, filters: FilterState): boolean {
  // Search — title or description, case-insensitive
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase()
    const inTitle = task.title.toLowerCase().includes(q)
    const inDesc = task.description.toLowerCase().includes(q)
    if (!inTitle && !inDesc) return false
  }

  // Assignee — exact match
  if (filters.assignee !== null && task.assignee !== filters.assignee) {
    return false
  }

  // Priority — exact match
  if (filters.priority !== null && task.priority !== filters.priority) {
    return false
  }

  // Tags — task must include ALL selected tags (AND semantics)
  if (filters.tags.length > 0) {
    const hasAll = filters.tags.every((tag) => task.tags.includes(tag))
    if (!hasAll) return false
  }

  return true
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns filtered + sorted task IDs for each column.
 *
 * Performance characteristics:
 * - Subscribes ONLY to tasks and filters (not the whole store)
 * - useMemo re-computes only when tasks or filters actually change
 * - Returns task IDs (strings), not full Task objects — components use their
 *   own stable selector `useStore(s => s.tasks[id])` to read individual tasks
 *
 * Usage:
 *   const { taskIdsByColumn, totalVisible } = useFilteredTasks()
 *   const todoIds = taskIdsByColumn['todo']
 */
export function useFilteredTasks() {
  // Shallow-compare tasks object and filters independently to minimize re-renders
  const tasks = useStore(useShallow((s) => s.tasks))
  const filters = useStore(useShallow((s) => s.filters))

  const result = useMemo(() => {
    const taskIdsByColumn: Record<Status, string[]> = {
      'todo': [],
      'in-progress': [],
      'done': [],
    }

    // Single pass over all tasks — O(n)
    for (const task of Object.values(tasks)) {
      if (taskMatchesFilters(task, filters)) {
        taskIdsByColumn[task.status].push(task.id)
      }
    }

    // Sort each column by `order` ascending (preserves drag-reorder positions)
    for (const status of Object.keys(taskIdsByColumn) as Status[]) {
      taskIdsByColumn[status].sort(
        (a, b) => (tasks[a]?.order ?? 0) - (tasks[b]?.order ?? 0)
      )
    }

    const totalVisible =
      taskIdsByColumn['todo'].length +
      taskIdsByColumn['in-progress'].length +
      taskIdsByColumn['done'].length

    return { taskIdsByColumn, totalVisible }
  }, [tasks, filters])

  return result
}

/**
 * Returns distinct assignee names across all tasks, sorted alphabetically.
 * Used to populate the assignee filter dropdown.
 */
export function useAssigneeOptions(): string[] {
  const tasks = useStore(useShallow((s) => s.tasks))
  return useMemo(
    () => [...new Set(Object.values(tasks).map((t) => t.assignee))].sort(),
    [tasks]
  )
}
