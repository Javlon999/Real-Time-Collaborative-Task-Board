import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/shallow'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Toast } from '@/types'

// ─── Icon mapping ─────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  Toast['type'],
  { icon: React.ReactNode; classes: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  error: {
    icon: <XCircle className="h-4 w-4 shrink-0" />,
    classes: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  },
  info: {
    icon: <Info className="h-4 w-4 shrink-0" />,
    classes: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    classes: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  },
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useStore((s) => s.removeToast)
  const duration = toast.durationMs ?? 4000
  const config = TOAST_CONFIG[toast.type]

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), duration)
    return () => clearTimeout(timer)
  }, [toast.id, duration, removeToast])

  return (
    /*
     * Framer Motion is permitted here — toasts are individual elements, not list items.
     * Rule from CLAUDE.md: Framer Motion ONLY on DragOverlay, modals, toasts.
     */
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'w-80 max-w-[calc(100vw-2rem)]',
        'pointer-events-auto',
        config.classes
      )}
      role="alert"
      aria-live="polite"
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-xs mt-0.5 opacity-80 leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

/**
 * ToastContainer — fixed bottom-right portal for toast notifications.
 *
 * Uses Framer Motion AnimatePresence so each toast animates in/out smoothly.
 * Max 5 toasts displayed simultaneously — oldest auto-dismissed first.
 */
export function ToastContainer() {
  const toasts = useStore(useShallow((s) => s.toasts))

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
      role="region"
    >
      <AnimatePresence mode="sync">
        {toasts.slice(-5).map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
