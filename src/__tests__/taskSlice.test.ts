/**
 * taskSlice.test.ts — unit tests for optimistic task operations.
 *
 * Tests the core optimistic update flow:
 *   optimisticXxx() → commitOptimistic() | rollbackOptimistic()
 *
 * Each test resets the store to a known state before running.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '@/store'
import type { Task } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    status: 'todo',
    priority: 'medium',
    assignee: 'Alice',
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    order: 1000,
    ...overrides,
  }
}

function resetStore(tasks: Record<string, Task> = {}) {
  useStore.setState({
    tasks,
    _snapshot: null,
    past: [],
    future: [],
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('taskSlice — optimisticMove', () => {
  beforeEach(() => {
    resetStore({ 'task-1': makeTask() })
  })

  it('updates task status and order immediately', () => {
    useStore.getState().optimisticMove('task-1', 'in-progress', 2000)

    const task = useStore.getState().tasks['task-1']
    expect(task.status).toBe('in-progress')
    expect(task.order).toBe(2000)
  })

  it('sets _optimistic flag to true', () => {
    useStore.getState().optimisticMove('task-1', 'done', 3000)

    const task = useStore.getState().tasks['task-1']
    expect(task._optimistic).toBe(true)
  })

  it('saves a snapshot before mutating', () => {
    useStore.getState().optimisticMove('task-1', 'done', 3000)

    const snapshot = useStore.getState()._snapshot
    expect(snapshot).not.toBeNull()
    // Snapshot preserves original status
    expect(snapshot!['task-1'].status).toBe('todo')
  })
})

describe('taskSlice — rollbackOptimistic', () => {
  beforeEach(() => {
    resetStore({ 'task-1': makeTask() })
  })

  it('restores tasks exactly to pre-mutation state', () => {
    useStore.getState().optimisticMove('task-1', 'done', 9000)
    useStore.getState().rollbackOptimistic()

    const task = useStore.getState().tasks['task-1']
    expect(task.status).toBe('todo')
    expect(task.order).toBe(1000)
    expect(task._optimistic).toBeUndefined()
  })

  it('clears _snapshot after rollback', () => {
    useStore.getState().optimisticMove('task-1', 'done', 9000)
    useStore.getState().rollbackOptimistic()

    expect(useStore.getState()._snapshot).toBeNull()
  })

  it('is a no-op when there is no snapshot', () => {
    // No optimistic op fired — rollback should not throw or mutate
    const tasksBefore = { ...useStore.getState().tasks }
    useStore.getState().rollbackOptimistic()
    expect(useStore.getState().tasks).toEqual(tasksBefore)
  })
})

describe('taskSlice — commitOptimistic', () => {
  beforeEach(() => {
    resetStore({ 'task-1': makeTask() })
  })

  it('clears _optimistic flag from all tasks', () => {
    useStore.getState().optimisticMove('task-1', 'done', 3000)
    expect(useStore.getState().tasks['task-1']._optimistic).toBe(true)

    useStore.getState().commitOptimistic()
    expect(useStore.getState().tasks['task-1']._optimistic).toBeUndefined()
  })

  it('clears _snapshot after commit', () => {
    useStore.getState().optimisticMove('task-1', 'done', 3000)
    useStore.getState().commitOptimistic()

    expect(useStore.getState()._snapshot).toBeNull()
  })

  it('keeps the mutated task values after commit', () => {
    useStore.getState().optimisticMove('task-1', 'done', 3000)
    useStore.getState().commitOptimistic()

    const task = useStore.getState().tasks['task-1']
    expect(task.status).toBe('done')
    expect(task.order).toBe(3000)
  })
})

describe('taskSlice — concurrent optimistic ops', () => {
  beforeEach(() => {
    resetStore({
      'task-1': makeTask({ id: 'task-1', status: 'todo' }),
      'task-2': makeTask({ id: 'task-2', status: 'todo', order: 2000 }),
    })
  })

  it('second optimisticMove overrides snapshot from first', () => {
    // First op
    useStore.getState().optimisticMove('task-1', 'in-progress', 5000)
    const snapshotAfterFirst = useStore.getState()._snapshot

    // Second op — overwrites snapshot with current state (post-first-move)
    useStore.getState().optimisticMove('task-2', 'done', 6000)
    const snapshotAfterSecond = useStore.getState()._snapshot

    // Second snapshot captures task-1 already moved to in-progress
    expect(snapshotAfterSecond!['task-1'].status).toBe('in-progress')
    // First snapshot had task-1 as todo
    expect(snapshotAfterFirst!['task-1'].status).toBe('todo')
  })
})
