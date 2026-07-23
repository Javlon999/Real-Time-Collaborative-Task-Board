import { useShallow } from 'zustand/shallow'
import { Kanban, Moon, Sun, Plus, Radio } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { selectUndoRedo } from '@/store/selectors'
import { HistoryIndicator } from '@/components/history/HistoryIndicator'
import { cn } from '@/lib/utils'

/**
 * Header — top bar of the application.
 *
 * Contains:
 *  - App title + icon
 *  - Undo / Redo buttons (Phase 7 will wire keyboard shortcuts; buttons work now)
 *  - Real-time simulator toggle (Phase 6 will start the loop)
 *  - Dark mode toggle (wired immediately)
 *  - "New task" button
 *
 * Uses semantic color tokens only — dark mode is handled by CSS variables.
 */
export function Header() {
  const { canUndo, canRedo, undoLabel, redoLabel } = useStore(
    useShallow(selectUndoRedo)
  )
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const isDarkMode = useStore((s) => s.isDarkMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const isSimulatorActive = useStore((s) => s.isSimulatorActive)
  const toggleSimulator = useStore((s) => s.toggleSimulator)
  const openModal = useStore((s) => s.openModal)

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-background shrink-0">
      {/* ── Brand ── */}
      <div className="flex items-center gap-2">
        <Kanban className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="font-semibold text-foreground text-sm tracking-tight">
          Task Board
        </span>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-1">
        {/* Undo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}
          aria-label={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}
          className="h-8 px-2 text-xs gap-1 font-mono"
        >
          ↩ Undo
        </Button>

        {/* Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title={canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'}
          aria-label={canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'}
          className="h-8 px-2 text-xs gap-1 font-mono"
        >
          ↪ Redo
        </Button>

        {/* Last action label */}
        <HistoryIndicator />

        <div className="w-px h-5 bg-border mx-1" role="separator" />

        {/* Real-time simulator toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSimulator}
          title={isSimulatorActive ? 'Stop real-time simulation' : 'Start real-time simulation'}
          aria-label={isSimulatorActive ? 'Stop real-time simulation' : 'Start real-time simulation'}
          aria-pressed={isSimulatorActive}
          className={cn(
            'h-8 px-2 text-xs gap-1.5',
            isSimulatorActive && 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          <Radio
            className={cn(
              'h-3.5 w-3.5',
              isSimulatorActive && 'animate-pulse'
            )}
          />
          {isSimulatorActive ? 'Live' : 'Paused'}
        </Button>

        <div className="w-px h-5 bg-border mx-1" role="separator" />

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Light mode' : 'Dark mode'}
          className="h-8 w-8"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <div className="w-px h-5 bg-border mx-1" role="separator" />

        {/* New task */}
        <Button
          size="sm"
          onClick={() => openModal('new')}
          className="h-8 px-3 text-xs gap-1"
          aria-label="Create new task"
        >
          <Plus className="h-3.5 w-3.5" />
          New task
        </Button>
      </div>
    </header>
  )
}
