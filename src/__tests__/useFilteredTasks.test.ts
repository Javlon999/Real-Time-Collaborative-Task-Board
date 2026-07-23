/**
 * useFilteredTasks.test.ts — unit tests for the taskMatchesFilters predicate.
 *
 * Tests the pure filtering function directly (Option A) — no React, no store,
 * no renderHook overhead. Fast, deterministic, and covers all filter combinations.
 */

import { describe, it, expect } from 'vitest'
import { taskMatchesFilters } from '@/hooks/useFilteredTasks'
import type { Task, FilterState } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Fix login bug',
    description: 'The login form fails on mobile',
    status: 'todo',
    priority: 'high',
    assignee: 'Alice',
    tags: ['frontend', 'auth'],
    createdAt: '2024-01-01T00:00:00Z',
    order: 1000,
    ...overrides,
  }
}

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    search: '',
    assignee: null,
    priority: null,
    tags: [],
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('taskMatchesFilters — no filters', () => {
  it('returns true for any task when all filters are empty', () => {
    expect(taskMatchesFilters(makeTask(), makeFilters())).toBe(true)
  })
})

describe('taskMatchesFilters — search', () => {
  it('matches on title (case-insensitive)', () => {
    const task = makeTask({ title: 'Fix Login Bug' })
    expect(taskMatchesFilters(task, makeFilters({ search: 'login' }))).toBe(true)
    expect(taskMatchesFilters(task, makeFilters({ search: 'LOGIN' }))).toBe(true)
    expect(taskMatchesFilters(task, makeFilters({ search: 'Login' }))).toBe(true)
  })

  it('matches on description (case-insensitive)', () => {
    const task = makeTask({ description: 'Fails on Mobile devices' })
    expect(taskMatchesFilters(task, makeFilters({ search: 'mobile' }))).toBe(true)
    expect(taskMatchesFilters(task, makeFilters({ search: 'MOBILE' }))).toBe(true)
  })

  it('returns false when search matches neither title nor description', () => {
    const task = makeTask({ title: 'Fix login', description: 'Auth issue' })
    expect(taskMatchesFilters(task, makeFilters({ search: 'payment' }))).toBe(false)
  })

  it('ignores whitespace-only search', () => {
    const task = makeTask()
    expect(taskMatchesFilters(task, makeFilters({ search: '   ' }))).toBe(true)
  })
})

describe('taskMatchesFilters — assignee filter', () => {
  it('returns true when assignee matches exactly', () => {
    const task = makeTask({ assignee: 'Alice' })
    expect(taskMatchesFilters(task, makeFilters({ assignee: 'Alice' }))).toBe(true)
  })

  it('returns false when assignee does not match', () => {
    const task = makeTask({ assignee: 'Alice' })
    expect(taskMatchesFilters(task, makeFilters({ assignee: 'Bob' }))).toBe(false)
  })

  it('returns true when assignee filter is null (no filter)', () => {
    const task = makeTask({ assignee: 'Alice' })
    expect(taskMatchesFilters(task, makeFilters({ assignee: null }))).toBe(true)
  })
})

describe('taskMatchesFilters — priority filter', () => {
  it('returns true when priority matches', () => {
    const task = makeTask({ priority: 'high' })
    expect(taskMatchesFilters(task, makeFilters({ priority: 'high' }))).toBe(true)
  })

  it('returns false when priority does not match', () => {
    const task = makeTask({ priority: 'low' })
    expect(taskMatchesFilters(task, makeFilters({ priority: 'high' }))).toBe(false)
  })

  it('returns true when priority filter is null', () => {
    const task = makeTask({ priority: 'low' })
    expect(taskMatchesFilters(task, makeFilters({ priority: null }))).toBe(true)
  })
})

describe('taskMatchesFilters — tag filter', () => {
  it('returns true when task includes all selected tags', () => {
    const task = makeTask({ tags: ['frontend', 'auth', 'urgent'] })
    expect(taskMatchesFilters(task, makeFilters({ tags: ['frontend', 'auth'] }))).toBe(true)
  })

  it('returns false when task is missing one of the selected tags', () => {
    const task = makeTask({ tags: ['frontend'] })
    expect(taskMatchesFilters(task, makeFilters({ tags: ['frontend', 'auth'] }))).toBe(false)
  })

  it('returns true when no tags are selected', () => {
    const task = makeTask({ tags: [] })
    expect(taskMatchesFilters(task, makeFilters({ tags: [] }))).toBe(true)
  })
})

describe('taskMatchesFilters — combined filters (AND logic)', () => {
  it('returns true only when ALL active filters match', () => {
    const task = makeTask({
      title: 'Fix login',
      assignee: 'Alice',
      priority: 'high',
      tags: ['frontend'],
    })
    const filters = makeFilters({
      search: 'login',
      assignee: 'Alice',
      priority: 'high',
      tags: ['frontend'],
    })
    expect(taskMatchesFilters(task, filters)).toBe(true)
  })

  it('returns false if any one filter fails', () => {
    const task = makeTask({
      title: 'Fix login',
      assignee: 'Alice',
      priority: 'high',
      tags: ['frontend'],
    })

    // All match except priority
    expect(taskMatchesFilters(task, makeFilters({
      search: 'login',
      assignee: 'Alice',
      priority: 'low',   // ← mismatch
      tags: ['frontend'],
    }))).toBe(false)

    // All match except search
    expect(taskMatchesFilters(task, makeFilters({
      search: 'payment',  // ← mismatch
      assignee: 'Alice',
      priority: 'high',
      tags: ['frontend'],
    }))).toBe(false)
  })
})
