/**
 * useUndoRedo — global keyboard shortcuts for undo/redo.
 *
 * Bindings:
 *   Ctrl/Cmd + Z             → undo
 *   Ctrl/Cmd + Shift + Z     → redo
 *
 * Guard: shortcuts are suppressed when focus is inside an <input> or
 * <textarea> so that native text editing undo/redo is not hijacked.
 *
 * Mount once at the App root — the listener is cleaned up on unmount.
 */

import { useEffect } from 'react'
import { useStore } from '@/store'

export function useUndoRedo() {
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is inside a text input — let native undo/redo work
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const isMod = e.ctrlKey || e.metaKey

      if (!isMod) return

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }

      // Also support Ctrl+Y as an alternative redo shortcut (common on Windows)
      if ((e.key === 'y' || e.key === 'Y') && !e.shiftKey) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
}
