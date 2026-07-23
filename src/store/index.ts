import { create } from 'zustand'           // ← named import — NOT default (removed in v5)
import { immer } from 'zustand/middleware/immer'

import { createTaskSlice, type TaskSlice } from './slices/taskSlice'
import { createHistorySlice, type HistorySlice } from './slices/historySlice'
import { createFilterSlice, type FilterSlice } from './slices/filterSlice'
import { createUISlice, type UISlice } from './slices/uiSlice'
import { createRealtimeSlice, type RealtimeSlice } from './slices/realtimeSlice'

// ---- Combined store type ----

export type RootStore =
  TaskSlice &
  HistorySlice &
  FilterSlice &
  UISlice &
  RealtimeSlice

// ---- Store instance ----

/**
 * The single Zustand store for the entire application.
 *
 * Architecture:
 *  - immer middleware wraps all slices so we can mutate state directly in set()
 *  - Slices are composed via spread — each contributes its own state and actions
 *  - useShallow from zustand/shallow should be used in all selectors that return
 *    objects/arrays to prevent unnecessary re-renders
 *
 * Usage:
 *   const task = useStore(useShallow(s => s.tasks[id]))
 *   const { addToast } = useStore(useShallow(s => ({ addToast: s.addToast })))
 */
export const useStore = create<RootStore>()(
  immer((...a) => ({
    ...createTaskSlice(...a),
    ...createHistorySlice(...a),
    ...createFilterSlice(...a),
    ...createUISlice(...a),
    ...createRealtimeSlice(...a),
  }))
)
