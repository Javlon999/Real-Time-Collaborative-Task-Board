/**
 * Mock data for the task board.
 *
 * Contains:
 *  1. SEED_TASKS — 30 hand-crafted tasks matching the spec's starter data + extras
 *  2. generateMockTasks(n) — deterministic generator for 1000+ tasks to prove virtualization
 *
 * On app startup, both are merged:
 *   const allTasks = [...SEED_TASKS, ...generateMockTasks(970)]
 * Giving ~1000 tasks (333 per column) to demonstrate TanStack Virtual performance.
 */

import type { Task, Status, Priority } from '@/types'

// ---- Lookup tables for the deterministic generator ----

const STATUSES: Status[] = ['todo', 'in-progress', 'done']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const ASSIGNEES = ['John Doe', 'Jane Smith', 'Alice Chen', 'Bob Wilson', 'Carol Davis', 'Dave Lee']
const TAG_POOL = [
  'frontend', 'backend', 'design', 'security', 'urgent', 'bug', 'feature',
  'docs', 'testing', 'devops', 'performance', 'refactor', 'api', 'ui', 'ux',
]
const TITLE_PREFIXES = [
  'Implement', 'Fix', 'Refactor', 'Design', 'Update', 'Add', 'Remove',
  'Investigate', 'Review', 'Optimize', 'Test', 'Document', 'Deploy', 'Configure',
]
const TITLE_SUBJECTS = [
  'authentication flow', 'payment gateway', 'user dashboard', 'API endpoints',
  'database schema', 'CI/CD pipeline', 'error handling', 'search feature',
  'notification system', 'analytics module', 'caching layer', 'rate limiting',
  'logging infrastructure', 'test coverage', 'accessibility audit',
  'mobile responsiveness', 'dark mode', 'onboarding flow', 'admin panel',
  'export functionality',
]

// ---- Seed tasks (spec-provided + extras) ----

export const SEED_TASKS: Task[] = [
  {
    id: 'seed-1',
    title: 'Implement authentication',
    description: 'Add JWT-based auth with refresh token rotation and secure cookie storage.',
    status: 'todo',
    priority: 'high',
    assignee: 'John Doe',
    tags: ['backend', 'security'],
    createdAt: '2024-11-20T10:00:00Z',
    order: 1000,
  },
  {
    id: 'seed-2',
    title: 'Design new landing page',
    description: 'Create mockups for homepage redesign. Align with new brand guidelines.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Jane Smith',
    tags: ['design', 'frontend'],
    createdAt: '2024-11-19T14:30:00Z',
    order: 1000,
  },
  {
    id: 'seed-3',
    title: 'Fix payment gateway bug',
    description: 'Users unable to complete checkout. Stripe webhook events not processed.',
    status: 'todo',
    priority: 'high',
    assignee: 'John Doe',
    tags: ['backend', 'urgent'],
    createdAt: '2024-11-21T09:15:00Z',
    order: 2000,
  },
  {
    id: 'seed-4',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment to staging.',
    status: 'done',
    priority: 'medium',
    assignee: 'Dave Lee',
    tags: ['devops'],
    createdAt: '2024-11-15T11:00:00Z',
    order: 1000,
  },
  {
    id: 'seed-5',
    title: 'Add search functionality',
    description: 'Full-text search across tasks with Elasticsearch. Debounce 300ms.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Alice Chen',
    tags: ['backend', 'feature'],
    createdAt: '2024-11-18T08:45:00Z',
    order: 2000,
  },
  {
    id: 'seed-6',
    title: 'Write unit tests for auth module',
    description: 'Achieve 90% coverage on authentication service. Use Jest + Supertest.',
    status: 'todo',
    priority: 'medium',
    assignee: 'Bob Wilson',
    tags: ['testing', 'backend'],
    createdAt: '2024-11-22T13:00:00Z',
    order: 3000,
  },
  {
    id: 'seed-7',
    title: 'Optimize database queries',
    description: 'N+1 queries detected in dashboard endpoint. Add eager loading and indexes.',
    status: 'todo',
    priority: 'high',
    assignee: 'Alice Chen',
    tags: ['backend', 'performance'],
    createdAt: '2024-11-20T16:30:00Z',
    order: 4000,
  },
  {
    id: 'seed-8',
    title: 'Create user onboarding flow',
    description: 'Step-by-step wizard for new users. Includes profile setup and tour.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Jane Smith',
    tags: ['frontend', 'ux'],
    createdAt: '2024-11-17T10:15:00Z',
    order: 3000,
  },
  {
    id: 'seed-9',
    title: 'Fix mobile navigation bug',
    description: 'Hamburger menu not closing after route change on iOS Safari.',
    status: 'done',
    priority: 'high',
    assignee: 'Carol Davis',
    tags: ['frontend', 'bug'],
    createdAt: '2024-11-16T14:00:00Z',
    order: 2000,
  },
  {
    id: 'seed-10',
    title: 'Document REST API',
    description: 'Add OpenAPI 3.0 specs for all endpoints. Generate interactive docs with Swagger.',
    status: 'done',
    priority: 'low',
    assignee: 'Bob Wilson',
    tags: ['docs', 'api'],
    createdAt: '2024-11-14T09:00:00Z',
    order: 3000,
  },
  {
    id: 'seed-11',
    title: 'Implement rate limiting',
    description: 'Add Redis-based rate limiting: 100 req/min per user, 1000 req/min per IP.',
    status: 'todo',
    priority: 'medium',
    assignee: 'Dave Lee',
    tags: ['backend', 'security'],
    createdAt: '2024-11-21T11:30:00Z',
    order: 5000,
  },
  {
    id: 'seed-12',
    title: 'Set up error monitoring',
    description: 'Integrate Sentry for both frontend and backend. Set up alert rules.',
    status: 'done',
    priority: 'medium',
    assignee: 'Alice Chen',
    tags: ['devops', 'backend'],
    createdAt: '2024-11-13T10:00:00Z',
    order: 4000,
  },
  {
    id: 'seed-13',
    title: 'Accessibility audit',
    description: 'Run axe-core and manual keyboard navigation tests. Fix WCAG AA violations.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Carol Davis',
    tags: ['frontend', 'ux'],
    createdAt: '2024-11-20T09:00:00Z',
    order: 4000,
  },
  {
    id: 'seed-14',
    title: 'Add dark mode support',
    description: 'System preference detection + manual toggle. Persist to localStorage.',
    status: 'done',
    priority: 'low',
    assignee: 'Jane Smith',
    tags: ['frontend', 'ui'],
    createdAt: '2024-11-12T15:00:00Z',
    order: 5000,
  },
  {
    id: 'seed-15',
    title: 'Migrate to TypeScript',
    description: 'Convert remaining JS files to strict TypeScript. Fix all type errors.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'John Doe',
    tags: ['refactor', 'frontend'],
    createdAt: '2024-11-10T08:00:00Z',
    order: 5000,
  },
]

// ---- Deterministic generator ----

/**
 * Generates n additional mock tasks.
 * Uses modulo arithmetic on the index for deterministic (same output every run) values.
 * All orders are offset by (SEED_TASKS.length * 1000 + index * 1000) to avoid collision.
 */
export function generateMockTasks(n: number): Task[] {
  const tasks: Task[] = []

  for (let i = 0; i < n; i++) {
    const statusIndex = i % STATUSES.length
    const priorityIndex = (i * 3 + 1) % PRIORITIES.length
    const assigneeIndex = (i * 7 + 2) % ASSIGNEES.length
    const titlePrefixIndex = i % TITLE_PREFIXES.length
    const titleSubjectIndex = (i * 2 + 1) % TITLE_SUBJECTS.length

    // Pick 1-3 tags deterministically
    const tagCount = (i % 3) + 1
    const tags: string[] = []
    for (let t = 0; t < tagCount; t++) {
      const tagIndex = (i * (t + 1) * 4 + t) % TAG_POOL.length
      const tag = TAG_POOL[tagIndex]
      if (!tags.includes(tag)) tags.push(tag)
    }

    // Spread creation dates over the past 60 days
    const daysAgo = i % 60
    const createdAt = new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000
    ).toISOString()

    tasks.push({
      id: `gen-${i + 1}`,
      title: `${TITLE_PREFIXES[titlePrefixIndex]} ${TITLE_SUBJECTS[titleSubjectIndex]}`,
      description: `Auto-generated task #${i + 1}. Covers ${tags.join(', ')} work.`,
      status: STATUSES[statusIndex],
      priority: PRIORITIES[priorityIndex],
      assignee: ASSIGNEES[assigneeIndex],
      tags,
      createdAt,
      // Offset orders past the seed tasks so there are no conflicts
      order: (SEED_TASKS.length + i + 1) * 1000,
    })
  }

  return tasks
}

/**
 * Returns the full initial dataset for the board:
 * 15 curated seed tasks + 985 generated tasks ≈ 1000 total.
 * Loaded once at app startup.
 */
export function getInitialTasks(): Record<string, Task> {
  const all = [...SEED_TASKS, ...generateMockTasks(985)]
  return Object.fromEntries(all.map((t) => [t.id, t]))
}
