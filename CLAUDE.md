# Real-Time Collaborative Task Board — CLAUDE.md

> This file is the single source of truth for every AI session working on this project.
> Read this BEFORE writing any code. Every decision here was made deliberately.

---

## Project Summary

A kanban-style task management board that demonstrates:
- Real-time collaboration simulation (external user changes every 10–15s)
- Optimistic updates with automatic rollback on failure
- Full undo/redo system (Part 3 — Option A)
- Virtualized rendering for 1000+ tasks per column
- Clean, performant, type-safe React architecture

**This is an assessment project.** Quality, correctness, and depth matter more than speed.

---

## Project Status

All 8 phases complete. Last session: Phase 8 (tests + polish).
**50/50 Vitest tests passing. `tsc --noEmit` → 0 errors.**

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation — Vite, Tailwind, shadcn, types, Zustand store skeleton, mock data | complete ✓ |
| 2 | Core UI — BoardView, KanbanColumn (virtualized), TaskCard (memoized), FilterBar | complete ✓ |
| 3 | Drag & Drop — @dnd-kit, DragOverlay, cross-column transfer | complete ✓ |
| 4 | Task CRUD — Create/Edit modal, form validation | complete ✓ |
| 5 | Optimistic Updates — mock API, snapshot/rollback, loading states on cards | complete ✓ |
| 6 | Real-Time Simulation — useRealtimeSimulator, toasts, conflict detection | complete ✓ |
| 7 | Undo/Redo — historySlice, keyboard shortcuts, HistoryIndicator | complete ✓ |
| 8 | Polish & Tests — Vitest tests, empty column placeholder | complete ✓ |

---

## Known Bugs Fixed (do not reintroduce)

### 1. `structuredClone` on Immer Proxy → `DataCloneError`
**Symptom:** Crash on delete/create/update/move.
**Cause:** `structuredClone(state.tasks)` was called inside an Immer `set()` callback — `state` is a Proxy and cannot be cloned.
**Fix:** Call `structuredClone(get().tasks)` OUTSIDE the `set()` callback, then assign the result inside.
```ts
// WRONG — crashes
set((state) => { state._snapshot = structuredClone(state.tasks) })

// CORRECT
const snapshot = structuredClone(get().tasks)
set((state) => { state._snapshot = snapshot })
```

### 2. `enableMapSet()` missing → Immer crashes on `Set<string>`
**Symptom:** Error "The plugin for 'MapSet' has not been loaded into Immer".
**Cause:** `loadingIds` is a `Set<string>`. Immer requires `enableMapSet()` to handle Set/Map.
**Fix:** Call `enableMapSet()` in BOTH `src/main.tsx` AND `src/__tests__/setup.ts`.

### 3. Modal `useEffect` resetting `isSubmitting` mid-flight
**Symptom:** Modal loading spinner disappears immediately after clicking Save/Delete, then modal stays open idle for 2 seconds.
**Cause:** The optimistic mutation updates `editingTask` in the store instantly, re-triggering `useEffect([..., editingTask])` which reset `isSubmitting`/`isDeleting` to `false`.
**Fix:** Use a `useRef isBusyRef` guard at the top of the effect:
```ts
const isBusyRef = useRef(false)
useEffect(() => {
  if (!isOpen) return
  if (isBusyRef.current) return  // ← skip reset while API in-flight
  ...
}, [isOpen, isEdit, editingTask])
```

---

## Tech Stack (DO NOT change without documenting reason)

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite + TypeScript (strict) | Fast HMR, strict types, industry standard |
| State | Zustand v5 + immer middleware | No re-render problem, great DevTools, clean optimistic pattern |
| Styling | Tailwind CSS **v3.4.x** + shadcn/ui | Production-quality components, zero custom CSS overhead |
| DnD | @dnd-kit/core + @dnd-kit/sortable | Modern, accessible, TS-native, works with virtualization |
| Virtualization | TanStack Virtual v3 (`@tanstack/react-virtual`) | Best dynamic height support via `measureElement` |
| Testing | Vitest + React Testing Library | Vite-native, same API as Jest, fast startup |
| Animations | Framer Motion (scoped — see rules below) | Only on overlays/modals/toasts, NOT on list items |
| Part 3 | **Option A: Undo/Redo System** | History stack, keyboard shortcuts, integrates with optimistic updates |

### Pinned Versions (critical)
```
tailwindcss@^3.4.x   ← DO NOT upgrade to v4 — breaks shadcn/ui entirely
zustand@^5           ← named `create` export, NOT default import
@tanstack/react-virtual@^3
@dnd-kit/core@^6
@dnd-kit/sortable@^8
framer-motion@^11
```

---

## Directory Structure

```
src/
├── components/
│   ├── board/
│   │   ├── BoardView.tsx          # Root kanban layout — 3 columns side by side
│   │   ├── KanbanColumn.tsx       # Single column with TanStack Virtual scroll
│   │   └── BoardDragOverlay.tsx   # Floating card portal rendered during drag
│   ├── task/
│   │   ├── TaskCard.tsx           # Individual card — React.memo, stable selector
│   │   ├── SortableTaskCard.tsx   # useSortable wrapper connecting dnd-kit to TaskCard
│   │   ├── TaskModal.tsx          # Create / edit modal (shadcn Dialog)
│   │   └── TaskCardSkeleton.tsx   # Skeleton loading state
│   ├── filters/
│   │   ├── FilterBar.tsx          # Full filter row (search + assignee + priority)
│   │   └── SearchInput.tsx        # Debounced 300ms search input
│   ├── history/
│   │   └── HistoryIndicator.tsx   # Shows last undoable action label in header
│   ├── layout/
│   │   ├── Header.tsx             # Title, dark mode toggle, undo/redo buttons
│   │   ├── ToastContainer.tsx     # Renders toast notifications
│   │   └── ErrorBoundary.tsx      # Class-based error boundary with fallback UI
│   └── ui/                        # shadcn generated — DO NOT hand-edit these files
├── store/
│   ├── index.ts                   # Combined Zustand store (all slices merged)
│   ├── slices/
│   │   ├── taskSlice.ts           # Tasks CRUD + optimistic snapshot/rollback
│   │   ├── historySlice.ts        # Undo/redo stack (max 50 entries)
│   │   ├── filterSlice.ts         # search, assignee, priority filter state
│   │   ├── uiSlice.ts             # toasts[], openModalId, loadingIds Set, draggingId
│   │   └── realtimeSlice.ts       # Simulator active flag, last external change
│   └── selectors.ts               # Memoized derived selectors used across components
├── hooks/
│   ├── useDragAndDrop.ts          # All @dnd-kit logic isolated here
│   ├── useOptimisticTask.ts       # Wraps API calls with snapshot → commit/rollback
│   ├── useUndoRedo.ts             # Global keyboard listener Ctrl+Z / Ctrl+Shift+Z
│   ├── useRealtimeSimulator.ts    # setTimeout loop — simulates external user changes
│   ├── useFilteredTasks.ts        # Returns filtered+sorted task IDs per column (memoized)
│   └── useVirtualColumn.ts        # TanStack Virtual config — shared across columns
├── types/
│   └── index.ts                   # ALL TypeScript interfaces and type aliases
├── lib/
│   ├── api.ts                     # Mock API — setTimeout 2s + 10% random failure rate
│   ├── mockData.ts                # 15 seed tasks + generateMockTasks(n) generator
│   └── utils.ts                   # cn() (clsx + tailwind-merge), date formatters
└── __tests__/
    ├── setup.ts                   # enableMapSet() + @testing-library/jest-dom
    ├── taskSlice.test.ts          # 14 tests: optimistic ops, rollback, CRUD
    ├── historySlice.test.ts       # 12 tests: push/undo/redo/max-50 cap
    ├── useFilteredTasks.test.ts   # 10 tests: filter combinations
    └── useUndoRedo.test.ts        # 14 tests: keyboard shortcuts, input guards, cleanup
```

---

## TypeScript Data Model

```ts
// src/types/index.ts — canonical source, never duplicate these elsewhere

type Status   = 'todo' | 'in-progress' | 'done';
type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee: string;
  tags: string[];
  createdAt: string;        // ISO 8601 string
  order: number;            // sort position within its column (integer, gapped by 1000)
  _optimistic?: boolean;    // true while awaiting API confirmation — never persisted
}

interface HistoryAction {
  id: string;
  type: 'MOVE' | 'CREATE' | 'UPDATE' | 'DELETE';
  label: string;            // human-readable: "Moved 'Implement auth' to In Progress"
  snapshot: Record<string, Task>;  // full tasks state BEFORE this action
  timestamp: number;        // Date.now()
}

interface FilterState {
  search: string;
  assignee: string | null;
  priority: Priority | null;
  tags: string[];           // filter tasks that include ALL selected tags (AND logic)
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  durationMs?: number;      // default 4000
}

interface ExternalChange {
  taskId: string;
  taskTitle: string;
  field: keyof Task;
  newValue: unknown;
  simulatedUser: string;    // "Alice" | "Bob" | "Carol" | "Dave"
  timestamp: number;
}
```

---

## Zustand Store Architecture

```
useStore (combined)
  ├── taskSlice       tasks: Record<id, Task>
  │                   _snapshot: Record<id, Task> | null
│                   optimisticMove / optimisticAdd / optimisticUpdate / optimisticDelete
│                   commitOptimistic / rollbackOptimistic / restoreSnapshot
│                   applyExternalChange (for real-time simulator)
  │
  ├── historySlice    past: HistoryAction[]   (max 50, drop oldest)
  │                   future: HistoryAction[]
  │                   pushHistory(action) / undo() / redo()
  │
  ├── filterSlice     search / assignee / priority / tags
  │                   setFilter / resetFilters
  │
  ├── uiSlice         toasts: Toast[]
  │                   openModalId: string | null   (task id or 'new')
  │                   loadingIds: Set<string>       (task ids with in-flight ops)
  │                   draggingId: string | null
  │                   isDarkMode: boolean
  │                   addToast / removeToast / openModal / closeModal / setLoading / toggleDarkMode
  │
  └── realtimeSlice   isSimulatorActive: boolean
                      lastExternalChange: ExternalChange | null
                      toggleSimulator / setLastExternalChange
```

### Slice Pattern (v5 — follow exactly)

```ts
import { create } from 'zustand'           // ← named import, NOT default
import { immer } from 'zustand/middleware/immer'

export const createTaskSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],              // ← required in v5
  [],
  TaskSlice
> = (set, get) => ({ ... })

export const useStore = create<RootStore>()(
  immer((...a) => ({
    ...createTaskSlice(...a),
    ...createHistorySlice(...a),
    ...createFilterSlice(...a),
    ...createUISlice(...a),
    ...createRealtimeSlice(...a),
  }))
)
```

---

## Critical Patterns

### 1. Optimistic Updates (ALWAYS follow this exact flow)

```
User action (drag / edit / create / delete)
  ↓
const snapshot = structuredClone(get().tasks)   ← OUTSIDE set()
store.optimisticXxx()     → saves snapshot, applies change to UI instantly
store.setLoading(id, true)
  ↓
api.xxx() fires           → 2s delay, 10% random failure
  ↓
  ├─ SUCCESS → store.commitOptimistic()
  │            store.pushHistory({ type, label, snapshot })
  │            store.setLoading(id, false)
  │            addToast({ type: 'success' })
  │
  └─ FAILURE → store.restoreSnapshot(snapshot)   ← per-closure, not shared _snapshot slot
               addToast({ type: 'error' })
               store.setLoading(id, false)
               DO NOT push to history — the action never happened
```

**Rule: History only records committed reality, never optimistic intent.**

### 2. Undo/Redo Rules

- `pushHistory()` called in hooks (useOptimisticTask, useDragAndDrop) after `commitOptimistic()` — never inside store slices
- `past[]` cap: 50 entries — `past.shift()` before pushing when at limit
- `undo()`: pop `past` → restore snapshot → push redo entry to `future`
- `redo()`: pop `future` → restore snapshot → push undo entry to `past`
- New user action clears `future[]` entirely (standard undo/redo contract)
- Keyboard: `useUndoRedo` hook — `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl+Y`
- Guard: skip shortcuts when focus is inside `<input>` / `<textarea>` / `contentEditable`

### 3. @dnd-kit + TanStack Virtual Integration Rules

```
ALWAYS:
  ✓ Use DragOverlay — dragged card is a portal clone, source card can unmount safely
  ✓ Use task.id (stable string) as draggable/droppable id — NEVER the virtual index
  ✓ Increase overscan to 15 during active drag (uiSlice.draggingId !== null)
  ✓ Apply ref={virtualizer.measureElement} + data-index={vItem.index} on row wrapper
  ✓ Use closestCenter collision detection

NEVER:
  ✗ Use virtual row index as drag ID or React key
  ✗ Set height: on the virtualizer row wrapper div
  ✗ Use react-beautiful-dnd (deprecated, incompatible with React 18)
```

**Virtualizer row wrapper pattern (exact — do not deviate):**
```tsx
<div
  key={taskId}                               // stable task id
  data-index={vItem.index}                   // required by measureElement
  ref={virtualizer.measureElement}           // auto-measures after mount
  style={{
    position: 'absolute',
    top: 0, left: 0, width: '100%',
    transform: `translateY(${vItem.start}px)`,
    // NO height property here
  }}
>
  <SortableTaskCard taskId={taskId} />
</div>
```

### 4. Preventing Unnecessary Re-renders

```ts
// ✓ CORRECT — subscribes only to one task
const task = useStore(useShallow(s => s.tasks[taskId]))

// ✓ CORRECT — stable shallow comparison on multiple values
const { toasts, openModalId } = useStore(useShallow(s => ({
  toasts: s.toasts,
  openModalId: s.openModalId,
})))

// ✗ WRONG — new object every render → infinite re-render loop
const task = useStore(s => ({ ...s.tasks[taskId] }))

// ✗ WRONG — subscribes to entire store
const everything = useStore()
```

All `TaskCard` components must be wrapped in `React.memo`.
`useFilteredTasks` result must be wrapped in `useMemo` with `[tasks, filters]` deps.

### 5. Real-Time Simulator Pattern

- `setTimeout` loop, 10–15s random delay, self-rescheduling
- Read store state at tick time via `useStore.getState()` — avoids stale closures
- Calls `applyExternalChange()` directly — no optimistic, no snapshot (already committed)
- Info toast on every change, warning toast on conflict (modal open for changed task)
- Cleanup: `clearTimeout` in `useEffect` return

### 6. Mock API Contract

```ts
const SIMULATED_DELAY_MS = 2000
const FAILURE_RATE = 0.1  // 10%

export const api = {
  moveTask:   (id, payload) => simulateApiCall({ id, ...payload }),
  createTask: (task)        => simulateApiCall(task),
  updateTask: (id, payload) => simulateApiCall({ id, ...payload }),
  deleteTask: (id)          => simulateApiCall({ id }),
}
```

---

## Performance Rules (non-negotiable)

| Rule | Implementation |
|---|---|
| `TaskCard` never re-renders if task unchanged | `React.memo` + `useShallow` selector |
| Filter computation runs once per filter change | `useMemo` in `useFilteredTasks` |
| Search does NOT update store on every keystroke | 300ms debounce in `SearchInput` |
| 1000+ tasks do not cause DOM bloat | TanStack Virtual — ~15 nodes per column |
| Drag animations do not use JS | CSS `transition: transform 150ms ease` on card wrapper |
| Framer Motion never on list items | Only on: `DragOverlay`, modals, `Toast` entries |
| Snapshots use `structuredClone` | Never `JSON.parse/stringify` for state copies |

---

## Dark Mode

- Toggle: add/remove `dark` class on `<html>` via shadcn CSS variable system
- Persisted to `localStorage` key `"theme"`, hydrated in `main.tsx` before first render
- Use semantic Tailwind tokens only: `bg-background`, `text-foreground`, `bg-card`, etc.
- Never use raw colors like `bg-white` or `text-gray-900` in components

---

## DO NOT List

```
✗ Do NOT upgrade Tailwind to v4 — it breaks shadcn/ui
✗ Do NOT import `create` as default from zustand — removed in v5
✗ Do NOT use virtual row index as a drag ID, React key, or stable reference
✗ Do NOT call structuredClone(state.tasks) inside an Immer set() callback — use get()
✗ Do NOT forget enableMapSet() in main.tsx AND test setup when using Set/Map in Immer
✗ Do NOT push to history on failure/rollback — history = committed reality only
✗ Do NOT clear future[] on undo/redo — only clear on NEW user actions
✗ Do NOT use Framer Motion layout prop on list items — causes mass layout recalc
✗ Do NOT animate 1000 cards simultaneously
✗ Do NOT subscribe to the entire Zustand store in any component
✗ Do NOT set height on the TanStack Virtual row wrapper div
✗ Do NOT call useStore.getState() inside render functions — only in handlers/effects
```

---

## Testing

**Run:** `npx vitest run` | **Current result:** 50/50 passing

| File | Tests |
|------|-------|
| `__tests__/taskSlice.test.ts` | 14 — optimisticMove, rollback, commit, concurrent ops |
| `__tests__/historySlice.test.ts` | 12 — pushHistory, undo, redo, 50-item cap |
| `__tests__/useFilteredTasks.test.ts` | 10 — no filter, search, assignee, priority, tags, AND logic |
| `__tests__/useUndoRedo.test.ts` | 14 — all shortcuts, input guards, listener cleanup |

`taskMatchesFilters` is exported from `useFilteredTasks.ts` as a pure function for direct unit testing (no renderHook needed).

---

## Git Conventions

Commit format: `type: short description`
Types: `feat`, `fix`, `perf`, `refactor`, `test`, `chore`, `docs`
