import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * SearchInput — debounced text input for filtering tasks.
 *
 * Performance rule (CLAUDE.md):
 *  - Local state holds the immediate keystroke value
 *  - Store is updated ONLY after 300ms of inactivity
 *  - This prevents the filter recomputation + virtual list re-render
 *    from firing on every single keystroke
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search tasks…',
  className,
}: SearchInputProps) {
  // Local input state — tracks every keystroke immediately (no lag for the user)
  const [localValue, setLocalValue] = useState(value)

  // Sync local state if the external value is reset (e.g. "Clear all filters")
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce — only call onChange after 300ms of no typing
  useEffect(() => {
    if (localValue === value) return // nothing changed, skip timer
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue, onChange, value])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
        aria-label="Search tasks by title or description"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className={cn(
            'absolute right-2.5 top-1/2 -translate-y-1/2',
            'p-0.5 rounded text-muted-foreground hover:text-foreground',
            'transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Clear search"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
