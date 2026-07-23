import type { StateCreator } from 'zustand'
import type { Toast } from '@/types'
import type { RootStore } from '@/store'

// ---- Types ----

export interface UISlice {
  toasts: Toast[]
  /** Task id of the currently open edit modal, 'new' for create, null if closed */
  openModalId: string | null
  /**
   * Set of task ids that have an API call in flight.
   * Used to show loading spinners on individual cards.
   */
  loadingIds: Set<string>
  /** The task id currently being dragged, null otherwise */
  draggingId: string | null
  /** Whether dark mode is active. Persisted to localStorage. */
  isDarkMode: boolean

  // -- Toast actions --
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // -- Modal actions --
  openModal: (id: string | 'new') => void
  closeModal: () => void

  // -- Loading actions --
  setLoading: (taskId: string, loading: boolean) => void

  // -- Drag actions --
  setDragging: (taskId: string | null) => void

  // -- Theme --
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
}

// ---- Slice ----

export const createUISlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  UISlice
> = (set) => ({
  toasts: [],
  openModalId: null,
  loadingIds: new Set<string>(),
  draggingId: null,
  // Hydrate from localStorage on first load (handled in main.tsx)
  isDarkMode: false,

  addToast(toastData) {
    set((state) => {
      const id = crypto.randomUUID()
      state.toasts.push({ ...toastData, id })
    })
  },

  removeToast(id) {
    set((state) => {
      state.toasts = state.toasts.filter((t) => t.id !== id)
    })
  },

  openModal(id) {
    set((state) => {
      state.openModalId = id
    })
  },

  closeModal() {
    set((state) => {
      state.openModalId = null
    })
  },

  setLoading(taskId, loading) {
    set((state) => {
      if (loading) {
        state.loadingIds.add(taskId)
      } else {
        state.loadingIds.delete(taskId)
      }
    })
  },

  setDragging(taskId) {
    set((state) => {
      state.draggingId = taskId
    })
  },

  toggleDarkMode() {
    set((state) => {
      state.isDarkMode = !state.isDarkMode
    })
  },

  setDarkMode(value) {
    set((state) => {
      state.isDarkMode = value
    })
  },
})
