import { useEffect } from 'react'
import { useStore } from '@/store'
import { Header } from '@/components/layout/Header'
import { FilterBar } from '@/components/filters/FilterBar'
import { BoardView } from '@/components/board/BoardView'
import { ToastContainer } from '@/components/layout/ToastContainer'
import { TaskModal } from '@/components/task/TaskModal'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { useRealtimeSimulator } from '@/hooks/useRealtimeSimulator'
import { useUndoRedo } from '@/hooks/useUndoRedo'


function App() {
  const isDarkMode = useStore((s) => s.isDarkMode)

  // Start real-time simulation loop (controlled by isSimulatorActive in store)
  useRealtimeSimulator()
  // Global Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
  useUndoRedo()

  // Sync dark class and localStorage whenever preference changes
  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  return (
    // Top-level boundary: catches anything that escapes the inner boundaries
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        <Header />
        <FilterBar />
        {/* Board boundary: isolates virtualizer / DnD render failures */}
        <ErrorBoundary>
          <BoardView />
        </ErrorBoundary>
        {/* Modal boundary: isolates form render failures */}
        <ErrorBoundary>
          <TaskModal />
        </ErrorBoundary>
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}

export default App
