/**
 * useOptimisticTask — canonical wrapper for all task API calls.
 *
 * Encapsulates the full optimistic update flow defined in CLAUDE.md §1:
 *
 *   store.optimisticXxx()  →  save snapshot, apply change to UI instantly
 *        ↓
 *   api.xxx() fires        →  2s delay, 10% random failure
 *        ↓
 *   SUCCESS  →  commitOptimistic() + pushHistory() + success toast + removeLoading
 *   FAILURE  →  rollbackOptimistic() + error toast + removeLoading
 *
 * History is pushed ONLY here (never inside the store slices) so we can supply
 * the correct human-readable label and action type.
 *
 * Rule: `pushHistory` is called only on committed reality — never on failure.
 */

import { useCallback } from 'react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import type { CreateTaskPayload, UpdateTaskPayload } from '@/lib/api'

export function useOptimisticTask() {
  const optimisticAdd = useStore((s) => s.optimisticAdd)
  const optimisticUpdate = useStore((s) => s.optimisticUpdate)
  const optimisticDelete = useStore((s) => s.optimisticDelete)
  const commitOptimistic = useStore((s) => s.commitOptimistic)
  const restoreSnapshot = useStore((s) => s.restoreSnapshot)
  const pushHistory = useStore((s) => s.pushHistory)
  const addToast = useStore((s) => s.addToast)
  const setLoading = useStore((s) => s.setLoading)

  // ── Create ────────────────────────────────────────────────────────────────

  const createTask = useCallback(
    async (taskData: CreateTaskPayload): Promise<string | null> => {
      // 1. Snapshot is saved inside optimisticAdd
      const snapshotBefore = structuredClone(
        useStore.getState().tasks
      )
      const newId = optimisticAdd(taskData)
      setLoading(newId, true)

      try {
        await api.createTask(taskData)
        commitOptimistic()
        pushHistory({
          type: 'CREATE',
          label: `Created '${taskData.title}'`,
          snapshot: snapshotBefore,
        })
        addToast({ type: 'success', title: 'Task created' })
        return newId
      } catch {
        // Option A: restore from THIS closure's own snapshot, not the shared slot.
        restoreSnapshot(snapshotBefore)
        addToast({
          type: 'error',
          title: 'Failed to create task',
          description: 'Your changes were not saved. Please try again.',
        })
        return null
      } finally {
        setLoading(newId, false)
      }
    },
    [optimisticAdd, commitOptimistic, restoreSnapshot, pushHistory, addToast, setLoading]
  )

  // ── Update ────────────────────────────────────────────────────────────────

  const updateTask = useCallback(
    async (taskId: string, patch: UpdateTaskPayload, taskTitle: string): Promise<boolean> => {
      const snapshotBefore = structuredClone(useStore.getState().tasks)
      optimisticUpdate(taskId, patch)
      setLoading(taskId, true)

      try {
        await api.updateTask(taskId, patch)
        commitOptimistic()
        pushHistory({
          type: 'UPDATE',
          label: `Updated '${taskTitle}'`,
          snapshot: snapshotBefore,
        })
        addToast({ type: 'success', title: 'Task updated' })
        return true
      } catch {
        // Option A: restore from THIS closure's own snapshot, not the shared slot.
        restoreSnapshot(snapshotBefore)
        addToast({
          type: 'error',
          title: 'Failed to update task',
          description: 'Your changes were not saved. Please try again.',
        })
        return false
      } finally {
        setLoading(taskId, false)
      }
    },
    [optimisticUpdate, commitOptimistic, restoreSnapshot, pushHistory, addToast, setLoading]
  )

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteTask = useCallback(
    async (taskId: string, taskTitle: string): Promise<boolean> => {
      const snapshotBefore = structuredClone(useStore.getState().tasks)
      optimisticDelete(taskId)
      setLoading(taskId, true)

      try {
        await api.deleteTask(taskId)
        commitOptimistic()
        pushHistory({
          type: 'DELETE',
          label: `Deleted '${taskTitle}'`,
          snapshot: snapshotBefore,
        })
        addToast({ type: 'success', title: 'Task deleted' })
        return true
      } catch {
        // Option A: restore from THIS closure's own snapshot, not the shared slot.
        restoreSnapshot(snapshotBefore)
        addToast({
          type: 'error',
          title: 'Failed to delete task',
          description: 'The task was not deleted. Please try again.',
        })
        return false
      } finally {
        setLoading(taskId, false)
      }
    },
    [optimisticDelete, commitOptimistic, restoreSnapshot, pushHistory, addToast, setLoading]
  )

  return { createTask, updateTask, deleteTask }
}
