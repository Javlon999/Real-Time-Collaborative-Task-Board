import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /**
   * Custom fallback UI. Receives the error and a reset callback.
   * If omitted, the default fallback card is shown.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /**
   * Called whenever an error is caught — useful for external logging.
   */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Class-based Error Boundary (React only supports this pattern for error catching).
 *
 * Strategy:
 *  - Wrap `<BoardView>` to isolate virtualizer / DnD render failures.
 *  - Wrap `<TaskModal>` to isolate modal form render failures.
 *  - A top-level boundary in App catches anything that escapes both.
 *
 * On reset the component clears its error state, which causes React to
 * re-render the children tree from scratch.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to any external error logger (e.g. Sentry) via the optional prop
    this.props.onError?.(error, info)

    // Always log to console so DevTools shows the full component stack
    console.error('[ErrorBoundary] Caught render error:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  reset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    // Custom fallback takes full control if provided
    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset)
    }

    // Default fallback: minimal card, uses semantic tokens so dark mode works
    return <DefaultFallback error={this.state.error} onReset={this.reset} />
  }
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------

interface DefaultFallbackProps {
  error: Error
  onReset: () => void
}

function DefaultFallback({ error, onReset }: DefaultFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center w-full h-full min-h-[200px] p-6"
    >
      <div className="flex flex-col items-center gap-4 max-w-md w-full rounded-lg border border-destructive/40 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Something went wrong</h2>
        </div>

        {/* Error message — collapsed to one line, full text on hover */}
        <p
          className="w-full rounded bg-muted px-3 py-2 text-xs font-mono text-muted-foreground break-all line-clamp-4"
          title={error.message}
        >
          {error.message || 'An unexpected render error occurred.'}
        </p>

        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  )
}
