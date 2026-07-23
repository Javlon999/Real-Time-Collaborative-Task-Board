import type { StateCreator } from 'zustand'
import type { FilterState } from '@/types'
import type { RootStore } from '@/store'

// ---- Types ----

export interface FilterSlice {
  filters: FilterState

  /** Update one or more filter fields at once */
  setFilter: (patch: Partial<FilterState>) => void
  /** Reset all filters to their initial empty state */
  resetFilters: () => void
}

// ---- Defaults ----

const DEFAULT_FILTERS: FilterState = {
  search: '',
  assignee: null,
  priority: null,
  tags: [],
}

// ---- Slice ----

export const createFilterSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  FilterSlice
> = (set) => ({
  filters: { ...DEFAULT_FILTERS },

  setFilter(patch) {
    set((state) => {
      Object.assign(state.filters, patch)
    })
  },

  resetFilters() {
    set((state) => {
      state.filters = { ...DEFAULT_FILTERS }
    })
  },
})

// ---- Selector helpers (used in useFilteredTasks) ----

/** Returns true if any filter is currently active */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.assignee !== null ||
    filters.priority !== null ||
    filters.tags.length > 0
  )
}
