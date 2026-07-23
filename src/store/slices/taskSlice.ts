import type { StateCreator } from 'zustand'
import { nanoid } from 'nanoid'
import type { Task, ExternalChange } from '@/types'
import type { RootStore } from '@/store'

// ---- Types ----

export interface TaskSlice {
  /** All tasks keyed by id — single source of truth */
  tasks: Record<string, Task>
  /**
   * Full snapshot of tasks saved BEFORE an optimistic mutation.
   * null when no optimistic op is in flight.
   */
  _snapshot: Record<string, Task> | null

  // -- Optimistic operations --
  /** Instantly moves a task to a new status column, saves snapshot first */
  optimisticMove: (taskId: string, toStatus: Task['status'], toOrder: number) => void
  /** Instantly adds a new task to the store, saves snapshot first */
  optimisticAdd: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => string
  /** Instantly updates task fields, saves snapshot first */
  optimisticUpdate: (taskId: string, patch: Partial<Omit<Task, 'id'>>) => void
  /** Instantly removes a task, saves snapshot first */
  optimisticDelete: (taskId: string) => void

  // -- Commit / rollback --
  /** Called on API success — clears _optimistic flags and snapshot */
  commitOptimistic: () => void
  /** Called on API failure — restores tasks from snapshot */
  rollbackOptimistic: () => void
  /**
   * Called on API failure when a per-closure snapshot is available.
   * Restores from the explicit snapshot passed in rather than from the shared
   * _snapshot slot — this is safe even when two ops are in-flight simultaneously
   * because each closure holds its own independent copy.
   */
  restoreSnapshot: (snapshot: Record<string, Task>) => void

  // -- Real-time (external changes, no optimistic) --
  /** Applied directly from the real-time simulator, bypasses snapshot/history */
  applyExternalChange: (change: ExternalChange) => void
}

// ---- Slice ----

export const createTaskSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  TaskSlice
> = (set, get) => ({
  tasks: {},
  _snapshot: null,

  optimisticMove(taskId, toStatus, toOrder) {
    // structuredClone MUST be called on plain state (via get()) BEFORE entering
    // the Immer set() callback — Immer wraps state in a Proxy which cannot be cloned.
    const snapshot = structuredClone(get().tasks)
    set((state) => {
      state._snapshot = snapshot
      const task = state.tasks[taskId]
      if (!task) return
      task.status = toStatus
      task.order = toOrder
      task._optimistic = true
    })
  },

  optimisticAdd(taskData) {
    const id = nanoid()
    const snapshot = structuredClone(get().tasks)
    set((state) => {
      state._snapshot = snapshot
      // Calculate max order in target column + 1000
      const maxOrder = Object.values(state.tasks)
        .filter((t) => t.status === taskData.status)
        .reduce((max, t) => Math.max(max, t.order), 0)

      state.tasks[id] = {
        ...taskData,
        id,
        createdAt: new Date().toISOString(),
        order: maxOrder + 1000,
        _optimistic: true,
      }
    })
    return id
  },

  optimisticUpdate(taskId, patch) {
    const snapshot = structuredClone(get().tasks)
    set((state) => {
      state._snapshot = snapshot
      const task = state.tasks[taskId]
      if (!task) return
      Object.assign(task, patch)
      task._optimistic = true
    })
  },

  optimisticDelete(taskId) {
    const snapshot = structuredClone(get().tasks)
    set((state) => {
      state._snapshot = snapshot
      delete state.tasks[taskId]
    })
  },

  commitOptimistic() {
    set((state) => {
      // Clear optimistic flag from all tasks — they are now "real"
      Object.values(state.tasks).forEach((t) => {
        delete t._optimistic
      })
      state._snapshot = null
    })

    // Push to history AFTER committing — history records reality, not intent
    const { tasks } = get()
    // The actual pushHistory call is done by the calling hook (useOptimisticTask)
    // so it can supply the correct label and action type.
    // commitOptimistic() only handles the state cleanup.
    void tasks // suppress unused warning
  },

  rollbackOptimistic() {
    set((state) => {
      if (state._snapshot) {
        state.tasks = state._snapshot
        state._snapshot = null
      }
    })
  },

  restoreSnapshot(snapshot) {
    // Option A safety net: restore from the caller's own captured snapshot.
    // Unlike rollbackOptimistic(), this does NOT depend on the shared _snapshot
    // slot — so it is safe even when two operations are in-flight at the same time.
    set((state) => {
      state.tasks = snapshot
      state._snapshot = null
    })
  },

  applyExternalChange(change) {
    set((state) => {
      const task = state.tasks[change.taskId]
      if (!task) return
      // Type-safe: we trust the simulator to send valid field/value combos
      ;(task as Record<string, unknown>)[change.field as string] = change.newValue
    })
  },
})
