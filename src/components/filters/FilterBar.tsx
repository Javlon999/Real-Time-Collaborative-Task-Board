import { useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '@/store'
import { useAssigneeOptions } from '@/hooks/useFilteredTasks'
import { SearchInput } from './SearchInput'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Priority } from '@/types'

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High priority' },
  { value: 'medium', label: 'Medium priority' },
  { value: 'low', label: 'Low priority' },
]

/**
 * FilterBar — full filter row: search + assignee select + priority select + reset.
 *
 * Reads from and writes to filterSlice in the Zustand store.
 * SearchInput handles its own 300ms debounce internally.
 */
export function FilterBar() {
  const { search, assignee, priority } = useStore(
    useShallow((s) => ({
      search: s.filters.search,
      assignee: s.filters.assignee,
      priority: s.filters.priority,
    }))
  )
  const setFilter = useStore((s) => s.setFilter)
  const resetFilters = useStore((s) => s.resetFilters)

  const assignees = useAssigneeOptions()

  // Stable callbacks — prevents SearchInput useEffect from re-running
  const handleSearchChange = useCallback(
    (value: string) => setFilter({ search: value }),
    [setFilter]
  )

  const hasActiveFilters = search.trim() || assignee || priority

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm flex-wrap">
      {/* Filter icon label */}
      <SlidersHorizontal
        className="h-4 w-4 text-muted-foreground shrink-0"
        aria-hidden="true"
      />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={handleSearchChange}
        className="w-56 shrink-0"
      />

      {/* Assignee filter */}
      <Select
        value={assignee ?? 'all'}
        onValueChange={(val) =>
          setFilter({ assignee: val === 'all' ? null : val })
        }
      >
        <SelectTrigger
          className="w-40 h-9 text-sm"
          aria-label="Filter by assignee"
        >
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          {assignees.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={priority ?? 'all'}
        onValueChange={(val) =>
          setFilter({ priority: val === 'all' ? null : (val as Priority) })
        }
      >
        <SelectTrigger
          className="w-40 h-9 text-sm"
          aria-label="Filter by priority"
        >
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {PRIORITY_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset button — only visible when a filter is active */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className={cn(
            'h-9 gap-1 text-muted-foreground hover:text-foreground',
            'border border-border/50'
          )}
          aria-label="Clear all filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
