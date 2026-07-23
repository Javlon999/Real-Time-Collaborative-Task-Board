import type { StateCreator } from 'zustand'
import type { HistoryAction } from '@/types'
import type { RootStore } from '@/store'

// ---- Constants ----

const MAX_HISTORY = 50

// ---- Types ----

export interface HistorySlice {
  /** Actions already applied — top of stack = most recent */
  past: HistoryAction[]
  /** Actions available to redo — populated by undo() */
  future: HistoryAction[]

  /**
   * Push a new action onto the history stack.
   * - Automatically caps past[] at MAX_HISTORY by dropping the oldest entry.
   * - Clears future[] because a new action invalidates redo history.
   * - Called ONLY by commitOptimistic() — never directly from components.
   */
  pushHistory: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void

  /**
   * Undo the most recent action:
   * - Pop from past[], restore its snapshot to tasks
   * - Save current tasks state as a new entry pushed to future[]
   */
  undo: () => void

  /**
   * Redo the most recently undone action:
   * - Pop from future[], restore its snapshot to tasks
   * - Push current state back onto past[]
   */
  redo: () => void

  // undoLabel and redoLabel are NOT stored in the slice —
  // they are derived in selectors.ts (selectUndoRedo) by reading past[]/future[]
  // directly. Storing them as getter properties here caused a crash during
  // store initialization because immer triggers getters before get() is wired.
}

// ---- Slice ----

export const createHistorySlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  HistorySlice
> = (set, get) => ({
  past: [],
  future: [],

  pushHistory(actionData) {
    set((state) => {
      const action: HistoryAction = {
        ...actionData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }

      // Cap at MAX_HISTORY — drop the oldest if we're at the limit
      if (state.past.length >= MAX_HISTORY) {
        state.past.shift()
      }

      state.past.push(action)

      // Any new real action clears the redo stack — standard undo/redo contract
      state.future = []
    })
  },

  undo() {
    const { past, tasks } = get()
    if (past.length === 0) return

    const lastAction = past[past.length - 1]

    set((state) => {
      // Save current state so redo can restore it
      // We create a synthetic "redo entry" pointing to what tasks looked like before undo
      const redoEntry: HistoryAction = {
        id: crypto.randomUUID(),
        type: lastAction.type,
        label: lastAction.label,
        // snapshot for redo = current tasks (before we apply the undo)
        snapshot: structuredClone(tasks),
        timestamp: Date.now(),
      }

      // Restore from the action's snapshot
      state.tasks = structuredClone(lastAction.snapshot)

      // Move action from past → future
      state.past.pop()
      state.future.push(redoEntry)
    })
  },

  redo() {
    const { future, tasks } = get()
    if (future.length === 0) return

    const nextAction = future[future.length - 1]

    set((state) => {
      // Save current state back onto past so undo works after redo
      const undoEntry: HistoryAction = {
        id: crypto.randomUUID(),
        type: nextAction.type,
        label: nextAction.label,
        snapshot: structuredClone(tasks),
        timestamp: Date.now(),
      }

      // Restore the redo snapshot
      state.tasks = structuredClone(nextAction.snapshot)

      // Move action from future → past
      state.future.pop()
      state.past.push(undoEntry)
    })
  },
})
