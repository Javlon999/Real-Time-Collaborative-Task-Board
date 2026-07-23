// ============================================================
// src/types/index.ts — canonical type definitions
// ALL interfaces live here. Never duplicate in other files.
// ============================================================

// ------ Core domain types ------

export type Status = 'todo' | 'in-progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

/**
 * The primary entity — a single task card on the board.
 *
 * `order` uses integer gaps of 1000 (1000, 2000, 3000…) so new insertions
 * can be placed between existing tasks without reordering everything.
 *
 * `_optimistic` is a transient flag — true while an API call is in-flight.
 * It is never stored in persistent state; commitOptimistic() removes it.
 */
export interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  assignee: string
  tags: string[]
  createdAt: string   // ISO 8601 — e.g. "2024-11-20T10:00:00Z"
  order: number       // sort position within column (gapped by 1000)
  _optimistic?: boolean
}

// ------ History / Undo-Redo ------

/**
 * One entry in the undo stack.
 * `snapshot` is the FULL tasks map BEFORE this action was applied,
 * so undo() can restore it directly.
 */
export interface HistoryAction {
  id: string
  type: 'MOVE' | 'CREATE' | 'UPDATE' | 'DELETE'
  label: string
  snapshot: Record<string, Task>
  timestamp: number   // Date.now()
}

// ------ Filter state ------

export interface FilterState {
  search: string
  assignee: string | null
  priority: Priority | null
  tags: string[]
}

// ------ UI state ------

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
  /** Auto-dismiss after this many ms. Defaults to 4000. */
  durationMs?: number
}

// ------ Real-time simulation ------

/**
 * Represents a change made by a simulated external user.
 * Applied directly to tasks via applyExternalChange() — not optimistic.
 */
export interface ExternalChange {
  taskId: string
  taskTitle: string
  field: keyof Task
  newValue: unknown
  simulatedUser: string   // "Alice" | "Bob" | "Carol" | "Dave"
  timestamp: number
}

// Slice types are defined in their respective slice files and combined in store/index.ts.
// Slices import from types — types must NOT import from slices (circular dep).
