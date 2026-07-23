/**
 * Mock API — simulates network calls with:
 *  - 2 second artificial delay (SIMULATED_DELAY_MS)
 *  - 10% random failure rate (FAILURE_RATE)
 *
 * This file is the ONLY place that knows about the fake network.
 * All components interact with the store; only hooks call the API.
 */

import type { Task } from '@/types'

const SIMULATED_DELAY_MS = 2000
const FAILURE_RATE = 0.1 // 10%

// ---- Core simulator ----

async function simulateApiCall<T>(result: T): Promise<T> {
  await new Promise<void>((resolve) =>
    setTimeout(resolve, SIMULATED_DELAY_MS)
  )

  if (Math.random() < FAILURE_RATE) {
    throw new Error('Simulated API failure — please retry')
  }

  return result
}

// ---- API surface ----

export type MoveTaskPayload = {
  status: Task['status']
  order: number
}

export type CreateTaskPayload = Omit<Task, 'id' | 'createdAt' | 'order' | '_optimistic'>

export type UpdateTaskPayload = Partial<Omit<Task, 'id' | '_optimistic'>>

export const api = {
  /**
   * Simulate moving a task to a different column (status change).
   * Returns the updated task id and the new payload on success.
   */
  moveTask: (id: string, payload: MoveTaskPayload) =>
    simulateApiCall({ id, ...payload }),

  /**
   * Simulate creating a new task.
   * The returned object mirrors what would come back from a real REST API.
   */
  createTask: (task: CreateTaskPayload) =>
    simulateApiCall(task),

  /**
   * Simulate updating task fields (title, description, priority, assignee, tags).
   */
  updateTask: (id: string, payload: UpdateTaskPayload) =>
    simulateApiCall({ id, ...payload }),

  /**
   * Simulate deleting a task.
   */
  deleteTask: (id: string) =>
    simulateApiCall({ id }),
}
