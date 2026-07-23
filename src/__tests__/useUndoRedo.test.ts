/**
 * useUndoRedo.test.ts — keyboard shortcut hook tests.
 *
 * Strategy: renderHook mounts the hook (which attaches the keydown listener
 * to window). We then fire synthetic KeyboardEvents on window directly and
 * assert that undo() / redo() were called on the store.
 *
 * We seed the store with history entries so undo/redo actually mutate state,
 * allowing us to verify via state rather than spying on store methods.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { useStore } from '@/store'
import type { Task } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(id: string, status: Task['status'] = 'todo'): Task {
  return {
    id,
    title: `Task ${id}`,
    description: '',
    status,
    priority: 'medium',
    assignee: 'Alice',
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    order: 1000,
  }
}

function resetStore(tasks: Record<string, Task> = {}) {
  useStore.setState({ tasks, _snapshot: null, past: [], future: [] })
}

/** Seeds one history entry so undo() has something to pop. */
function seedHistory(taskBefore: Task) {
  const snapshot = { [taskBefore.id]: taskBefore }
  useStore.getState().pushHistory({
    type: 'MOVE',
    label: `Moved '${taskBefore.title}' to Done`,
    snapshot,
  })
}

/** Fire a KeyboardEvent on window, mirroring what the browser does. */
function fireKey(key: string, opts: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: opts.ctrl ?? false,
      metaKey: opts.meta ?? false,
      shiftKey: opts.shift ?? false,
      bubbles: true,
    })
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUndoRedo — Ctrl+Z triggers undo', () => {
  beforeEach(() => {
    const task = makeTask('t1', 'done')
    resetStore({ t1: task })
    seedHistory(makeTask('t1', 'todo')) // snapshot has t1 as todo
  })

  it('Ctrl+Z calls undo and restores snapshot', () => {
    renderHook(() => useUndoRedo())
    expect(useStore.getState().past).toHaveLength(1)

    fireKey('z', { ctrl: true })

    expect(useStore.getState().past).toHaveLength(0)
    expect(useStore.getState().tasks['t1'].status).toBe('todo')
  })

  it('Cmd+Z (Meta) also triggers undo', () => {
    renderHook(() => useUndoRedo())

    fireKey('z', { meta: true })

    expect(useStore.getState().past).toHaveLength(0)
    expect(useStore.getState().tasks['t1'].status).toBe('todo')
  })

  it('plain Z without modifier does NOT trigger undo', () => {
    renderHook(() => useUndoRedo())

    fireKey('z')

    // past unchanged — undo was not called
    expect(useStore.getState().past).toHaveLength(1)
  })
})

describe('useUndoRedo — Ctrl+Shift+Z triggers redo', () => {
  beforeEach(() => {
    const task = makeTask('t1', 'todo')
    resetStore({ t1: task })
    // Push then undo so future[] has an entry
    seedHistory(makeTask('t1', 'todo'))
    useStore.getState().undo()
  })

  it('Ctrl+Shift+Z calls redo', () => {
    renderHook(() => useUndoRedo())
    expect(useStore.getState().future).toHaveLength(1)

    fireKey('z', { ctrl: true, shift: true })

    expect(useStore.getState().future).toHaveLength(0)
    expect(useStore.getState().past).toHaveLength(1)
  })

  it('Cmd+Shift+Z also triggers redo', () => {
    renderHook(() => useUndoRedo())

    fireKey('z', { meta: true, shift: true })

    expect(useStore.getState().future).toHaveLength(0)
  })
})

describe('useUndoRedo — Ctrl+Y triggers redo (Windows alt)', () => {
  beforeEach(() => {
    const task = makeTask('t1', 'todo')
    resetStore({ t1: task })
    seedHistory(makeTask('t1', 'todo'))
    useStore.getState().undo()
  })

  it('Ctrl+Y calls redo', () => {
    renderHook(() => useUndoRedo())
    expect(useStore.getState().future).toHaveLength(1)

    fireKey('y', { ctrl: true })

    expect(useStore.getState().future).toHaveLength(0)
  })

  it('plain Y without modifier does NOT trigger redo', () => {
    renderHook(() => useUndoRedo())

    fireKey('y')

    expect(useStore.getState().future).toHaveLength(1)
  })
})

describe('useUndoRedo — input guard', () => {
  beforeEach(() => {
    const task = makeTask('t1', 'done')
    resetStore({ t1: task })
    seedHistory(makeTask('t1', 'todo'))
  })

  it('does NOT trigger undo when focus is inside an <input>', () => {
    renderHook(() => useUndoRedo())

    // Create and focus an input element
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
    )

    // past should still have 1 entry — undo was suppressed
    expect(useStore.getState().past).toHaveLength(1)

    document.body.removeChild(input)
  })

  it('does NOT trigger undo when focus is inside a <textarea>', () => {
    renderHook(() => useUndoRedo())

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    textarea.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
    )

    expect(useStore.getState().past).toHaveLength(1)

    document.body.removeChild(textarea)
  })

  it('does NOT trigger undo when focus is inside a contentEditable element', () => {
    renderHook(() => useUndoRedo())

    const div = document.createElement('div')
    div.contentEditable = 'true'
    // jsdom does not fully compute isContentEditable from the attribute —
    // explicitly define the getter so the hook's guard can detect it.
    Object.defineProperty(div, 'isContentEditable', { get: () => true, configurable: true })
    document.body.appendChild(div)
    div.focus()

    div.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
    )

    expect(useStore.getState().past).toHaveLength(1)

    document.body.removeChild(div)
  })
})

describe('useUndoRedo — listener cleanup', () => {
  it('removes keydown listener on unmount so undo no longer fires', () => {
    const task = makeTask('t1', 'done')
    resetStore({ t1: task })
    seedHistory(makeTask('t1', 'todo'))

    const { unmount } = renderHook(() => useUndoRedo())

    // Unmount removes the listener
    unmount()

    fireKey('z', { ctrl: true })

    // past unchanged — listener was cleaned up
    expect(useStore.getState().past).toHaveLength(1)
  })
})
