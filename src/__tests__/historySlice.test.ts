/**
 * historySlice.test.ts — unit tests for the undo/redo history stack.
 *
 * Tests the full push → undo → redo cycle, the 50-item cap,
 * and the contract that new actions clear future[].
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '@/store'
import type { Task, HistoryAction } from '@/types'

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

function makeHistoryAction(
  label: string,
  snapshot: Record<string, Task> = {}
): Omit<HistoryAction, 'id' | 'timestamp'> {
  return { type: 'MOVE', label, snapshot }
}

function resetStore(tasks: Record<string, Task> = {}) {
  useStore.setState({ tasks, _snapshot: null, past: [], future: [] })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('historySlice — pushHistory', () => {
  beforeEach(() => resetStore())

  it('adds action to past[]', () => {
    useStore.getState().pushHistory(makeHistoryAction('Moved task to Done'))
    expect(useStore.getState().past).toHaveLength(1)
    expect(useStore.getState().past[0].label).toBe('Moved task to Done')
  })

  it('clears future[] on new action', () => {
    // Manually seed a future entry
    useStore.setState({ future: [{ id: 'f1', type: 'MOVE', label: 'old redo', snapshot: {}, timestamp: 0 }] })
    useStore.getState().pushHistory(makeHistoryAction('New action'))
    expect(useStore.getState().future).toHaveLength(0)
  })

  it('accumulates multiple actions in order', () => {
    useStore.getState().pushHistory(makeHistoryAction('First'))
    useStore.getState().pushHistory(makeHistoryAction('Second'))
    useStore.getState().pushHistory(makeHistoryAction('Third'))

    const labels = useStore.getState().past.map((a) => a.label)
    expect(labels).toEqual(['First', 'Second', 'Third'])
  })

  it('caps past[] at 50 entries and drops the oldest', () => {
    // Push 51 entries
    for (let i = 1; i <= 51; i++) {
      useStore.getState().pushHistory(makeHistoryAction(`Action ${i}`))
    }

    const { past } = useStore.getState()
    expect(past).toHaveLength(50)
    // Oldest (Action 1) should have been dropped
    expect(past[0].label).toBe('Action 2')
    // Newest should be last
    expect(past[49].label).toBe('Action 51')
  })
})

describe('historySlice — undo', () => {
  beforeEach(() => resetStore())

  it('restores task snapshot from top of past[]', () => {
    const taskBefore = makeTask('t1', 'todo')
    resetStore({ t1: taskBefore })

    // Capture snapshot, move task, push history
    const snapshot = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'done', 2000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('Moved t1 to done', snapshot))

    // Undo — should restore to todo
    useStore.getState().undo()
    expect(useStore.getState().tasks['t1'].status).toBe('todo')
  })

  it('moves top of past[] to future[]', () => {
    const snapshot = structuredClone(useStore.getState().tasks)
    useStore.getState().pushHistory(makeHistoryAction('Action A', snapshot))
    expect(useStore.getState().past).toHaveLength(1)
    expect(useStore.getState().future).toHaveLength(0)

    useStore.getState().undo()
    expect(useStore.getState().past).toHaveLength(0)
    expect(useStore.getState().future).toHaveLength(1)
  })

  it('is a no-op when past[] is empty', () => {
    const tasksBefore = { ...useStore.getState().tasks }
    useStore.getState().undo()
    expect(useStore.getState().tasks).toEqual(tasksBefore)
    expect(useStore.getState().future).toHaveLength(0)
  })
})

describe('historySlice — redo', () => {
  beforeEach(() => resetStore())

  it('re-applies the undone action', () => {
    const task = makeTask('t1', 'todo')
    resetStore({ t1: task })

    const snapshot = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'done', 2000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('Moved t1 to done', snapshot))

    useStore.getState().undo()
    expect(useStore.getState().tasks['t1'].status).toBe('todo')

    useStore.getState().redo()
    expect(useStore.getState().tasks['t1'].status).toBe('done')
  })

  it('moves top of future[] back to past[]', () => {
    const snapshot = structuredClone(useStore.getState().tasks)
    useStore.getState().pushHistory(makeHistoryAction('Action A', snapshot))
    useStore.getState().undo()

    expect(useStore.getState().past).toHaveLength(0)
    expect(useStore.getState().future).toHaveLength(1)

    useStore.getState().redo()
    expect(useStore.getState().past).toHaveLength(1)
    expect(useStore.getState().future).toHaveLength(0)
  })

  it('is a no-op when future[] is empty', () => {
    const tasksBefore = { ...useStore.getState().tasks }
    useStore.getState().redo()
    expect(useStore.getState().tasks).toEqual(tasksBefore)
  })
})

// ── Multi-step undo/redo sequences ─────────────────────────────────────────────

describe('historySlice — multi-step undo/redo sequences', () => {
  beforeEach(() => resetStore())

  it('undo twice then redo once leaves state at the second action', () => {
    // Set up: t1 starts as todo
    const t1Initial = makeTask('t1', 'todo')
    resetStore({ t1: t1Initial })

    // Action 1: move t1 → in-progress
    const snap1 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'in-progress', 2000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('Moved t1 to in-progress', snap1))

    // Action 2: move t1 → done
    const snap2 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'done', 3000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('Moved t1 to done', snap2))

    expect(useStore.getState().tasks['t1'].status).toBe('done')
    expect(useStore.getState().past).toHaveLength(2)

    // Undo once → back to in-progress
    useStore.getState().undo()
    expect(useStore.getState().tasks['t1'].status).toBe('in-progress')
    expect(useStore.getState().past).toHaveLength(1)
    expect(useStore.getState().future).toHaveLength(1)

    // Undo again → back to todo
    useStore.getState().undo()
    expect(useStore.getState().tasks['t1'].status).toBe('todo')
    expect(useStore.getState().past).toHaveLength(0)
    expect(useStore.getState().future).toHaveLength(2)

    // Redo once → in-progress
    useStore.getState().redo()
    expect(useStore.getState().tasks['t1'].status).toBe('in-progress')
    expect(useStore.getState().past).toHaveLength(1)
    expect(useStore.getState().future).toHaveLength(1)
  })

  it('new action after undo clears future[]', () => {
    const t1 = makeTask('t1', 'todo')
    resetStore({ t1 })

    // Push two actions
    const snap1 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'in-progress', 2000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('Moved t1 to in-progress', snap1))

    const snap2 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'done', 3000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('Moved t1 to done', snap2))

    // Undo once — future now has one entry
    useStore.getState().undo()
    expect(useStore.getState().future).toHaveLength(1)

    // New action — future must be cleared
    const snap3 = structuredClone(useStore.getState().tasks)
    useStore.getState().pushHistory(makeHistoryAction('New action', snap3))
    expect(useStore.getState().future).toHaveLength(0)
    expect(useStore.getState().past).toHaveLength(2)
  })

  it('full round-trip: push 3 → undo all → redo all → state matches original', () => {
    const t1 = makeTask('t1', 'todo')
    const t2 = makeTask('t2', 'todo')
    resetStore({ t1, t2 })

    // Action 1
    const snap1 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'in-progress', 2000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('A1', snap1))

    // Action 2
    const snap2 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t2', 'done', 2000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('A2', snap2))

    // Action 3
    const snap3 = structuredClone(useStore.getState().tasks)
    useStore.getState().optimisticMove('t1', 'done', 3000)
    useStore.getState().commitOptimistic()
    useStore.getState().pushHistory(makeHistoryAction('A3', snap3))

    // Capture final committed state
    const finalState = structuredClone(useStore.getState().tasks)

    // Undo all 3
    useStore.getState().undo()
    useStore.getState().undo()
    useStore.getState().undo()
    expect(useStore.getState().past).toHaveLength(0)
    expect(useStore.getState().future).toHaveLength(3)
    expect(useStore.getState().tasks['t1'].status).toBe('todo')
    expect(useStore.getState().tasks['t2'].status).toBe('todo')

    // Redo all 3
    useStore.getState().redo()
    useStore.getState().redo()
    useStore.getState().redo()
    expect(useStore.getState().past).toHaveLength(3)
    expect(useStore.getState().future).toHaveLength(0)

    // State must match what it was after all 3 original actions
    expect(useStore.getState().tasks['t1'].status).toBe(finalState['t1'].status)
    expect(useStore.getState().tasks['t2'].status).toBe(finalState['t2'].status)
  })
})
