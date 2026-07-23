import type { StateCreator } from 'zustand'
import type { ExternalChange } from '@/types'
import type { RootStore } from '@/store'

// ---- Types ----

export interface RealtimeSlice {
  /** Whether the real-time simulator loop is running */
  isSimulatorActive: boolean
  /** The most recent change applied by the simulator, or null */
  lastExternalChange: ExternalChange | null

  toggleSimulator: () => void
  setLastExternalChange: (change: ExternalChange | null) => void
}

// ---- Slice ----

export const createRealtimeSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  RealtimeSlice
> = (set) => ({
  isSimulatorActive: true, // on by default to demo the feature immediately
  lastExternalChange: null,

  toggleSimulator() {
    set((state) => {
      state.isSimulatorActive = !state.isSimulatorActive
    })
  },

  setLastExternalChange(change) {
    set((state) => {
      state.lastExternalChange = change
    })
  },
})
