# Real-Time Collaborative Task Board

A kanban-style task management board built as a full-stack frontend assessment. Covers all three parts of the spec: core kanban UI (Part 1), optimistic updates + real-time simulation + virtualization (Part 2), and an undo/redo system (Part 3 — Option A).

---

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # 50 tests, all passing
npx tsc --noEmit  # 0 type errors
```

---

## Features

### Part 1 — Core Functionality

- 3-column kanban board: **Todo**, **In Progress**, **Done**
- Task cards display: title, description, priority (color-coded badge), assignee, created date, tags
- Drag-and-drop between columns and within columns via `@dnd-kit`
- **Create / Edit / Delete** modal with full validation — required fields, character limits, inline error messages
- **Filter** by assignee, priority, and tags (AND logic — a task must match all selected tags)
- **Search** by title or description with 300ms debounce

### Part 2 — Advanced Features

- **Optimistic updates** — every change applies to the UI instantly before the API responds; rolled back silently on failure
- **Mock API** — 2-second simulated delay, 10% random failure rate
- **Loading states** — spinner ring on cards with in-flight operations; Save/Delete buttons show loading state in modal
- **Race condition protection** — concurrent ops on the same card are blocked; each in-flight closure holds its own rollback snapshot, so concurrent ops on different cards are safe and independent
- **Real-time simulation** — background timer fires every 10–15s simulating an external user (Alice, Bob, Carol, or Dave) changing a random task field; shows an info toast on each change
- **Conflict detection** — if the changed task is currently open in the modal, shows a warning toast instead
- **Virtualized rendering** — TanStack Virtual renders ~15 DOM nodes per column regardless of total count; board ships with 1000 tasks to prove it

### Part 3 — Expert Challenge (Option A: Undo/Redo)

- **50-entry history stack** — oldest entry dropped when the cap is reached
- **Keyboard shortcuts** — `Ctrl/Cmd+Z` (undo), `Ctrl/Cmd+Shift+Z` (redo), `Ctrl+Y` (redo alias)
- Shortcuts suppressed when focus is inside `<input>`, `<textarea>`, or `contentEditable`
- **History Indicator** in the header shows the label of the action that will be undone/redone
- **History = committed reality** — actions are only recorded after the API confirms success; failed/rolled-back operations are never added to the stack and cannot be undone

---

## Tech Stack

| Library | Version | Why chosen | Rejected alternative |
|---|---|---|---|
| React | 18 | Concurrent features, broad ecosystem, assessment target | — |
| Vite | 5 | Sub-second HMR, native ESM, Vitest integration | Create React App (unmaintained) |
| TypeScript | 5 (strict) | Catches state shape bugs at compile time; required for large store | Plain JS |
| Zustand | v5 | Minimal boilerplate, no Provider wrapping, built-in `useShallow` for fine-grained subscriptions, excellent DevTools | Redux Toolkit (more boilerplate), Context API (causes full tree re-renders on every state change) |
| Immer (via zustand/middleware) | 10 | Write mutable-looking state mutations safely; required for the Set-based `loadingIds` | Manual spread updates (error-prone with nested state) |
| Tailwind CSS | **v3.4.x (pinned)** | Utility-first, zero unused CSS in prod, aligns with shadcn/ui | **v4 is explicitly excluded** — it breaks shadcn/ui's CSS variable system entirely |
| shadcn/ui | latest | Accessible, unstyled-at-core Radix primitives with Tailwind wiring; Dialog, Select, Badge used directly | Headless UI (less comprehensive), MUI (too opinionated) |
| @dnd-kit | core@6 + sortable@8 | Accessible (keyboard drag), TypeScript-native, works correctly with React 18 and virtualized lists | react-beautiful-dnd (archived, broken in React 18 StrictMode) |
| TanStack Virtual | v3 | Dynamic height support via `measureElement` — cards have variable content so fixed-height approaches fail | react-window (fixed height only), react-virtuoso (heavier) |
| Framer Motion | v11 | Declarative `AnimatePresence` for toast/modal transitions | CSS-only (insufficient for enter/exit sequencing), GSAP (overkill) |
| Vitest | v4 | Vite-native test runner, same API as Jest, no config needed for TSX/aliases | Jest (requires separate Babel/ts-jest config for Vite projects) |
| React Testing Library | latest | Tests behaviour, not implementation; pairs naturally with Vitest | Enzyme (implementation-focused, deprecated) |

---

## Architecture

### Store (Zustand + Immer)

The global state is split into 5 independent slices, all combined into a single `useStore`:

```
useStore
├── taskSlice        tasks: Record<id, Task>  |  _snapshot for rollback
│                    optimisticMove / optimisticAdd / optimisticUpdate / optimisticDelete
│                    commitOptimistic / rollbackOptimistic / restoreSnapshot
│                    applyExternalChange  ← used by real-time simulator
│
├── historySlice     past: HistoryAction[]  (max 50)  |  future: HistoryAction[]
│                    pushHistory / undo / redo
│
├── filterSlice      search / assignee / priority / tags
│                    setFilter / resetFilters
│
├── uiSlice          toasts[]  |  openModalId  |  loadingIds: Set<string>
│                    draggingId  |  isDarkMode
│                    addToast / removeToast / openModal / closeModal / setLoading
│
└── realtimeSlice    isSimulatorActive  |  lastExternalChange
                     toggleSimulator / setLastExternalChange
```

### Directory Structure

```
src/
├── components/
│   ├── board/          # BoardView (DndContext), KanbanColumn (virtualized), BoardDragOverlay
│   ├── task/           # TaskCard (memoized), SortableTaskCard (dnd wrapper), TaskModal, Skeleton
│   ├── filters/        # FilterBar, SearchInput (debounced)
│   ├── history/        # HistoryIndicator
│   ├── layout/         # Header, ToastContainer, ErrorBoundary
│   └── ui/             # shadcn/ui generated components — do not hand-edit
├── store/
│   ├── index.ts        # Combined store with Immer middleware
│   ├── slices/         # One file per slice (taskSlice, historySlice, filterSlice, uiSlice, realtimeSlice)
│   └── selectors.ts    # Memoized derived selectors (column counts, assignee list, undo/redo state)
├── hooks/
│   ├── useDragAndDrop.ts       # All @dnd-kit logic, order calculation, optimistic move
│   ├── useOptimisticTask.ts    # create/update/delete with snapshot → commit/rollback
│   ├── useFilteredTasks.ts     # Returns filtered+sorted task IDs per column (memoized)
│   ├── useRealtimeSimulator.ts # setTimeout loop, random mutations, conflict detection
│   ├── useUndoRedo.ts          # Global keyboard listener with input guard
│   └── useVirtualColumn.ts     # TanStack Virtual config shared across columns
├── types/index.ts      # All TypeScript interfaces: Task, HistoryAction, FilterState, Toast, ExternalChange
├── lib/
│   ├── api.ts          # Mock API: 2s delay + 10% failure rate
│   ├── mockData.ts     # 15 seed tasks + generateMockTasks(n) for 1000-task demo
│   └── utils.ts        # cn() helper, date formatters
└── __tests__/          # Vitest test suites (see Testing section)
```

### Data Flow — Optimistic Update

```
User action (drag / create / edit / delete)
  │
  ├─ snapshot = structuredClone(get().tasks)   ← captured OUTSIDE Immer set()
  ├─ optimisticXxx()   → applies change to UI immediately
  ├─ setLoading(id, true)
  │
  ├─ api.xxx()  →  2s delay  →  10% chance of rejection
  │
  ├─ SUCCESS:  commitOptimistic()
  │            pushHistory({ type, label, snapshot })
  │            setLoading(id, false)
  │            addToast('success')
  │
  └─ FAILURE:  restoreSnapshot(snapshot)   ← per-closure, not the shared _snapshot slot
               addToast('error')
               setLoading(id, false)
               (nothing pushed to history)
```

---

## Key Design Decisions

### 1. `structuredClone` must be called outside Immer's `set()` callback

Immer wraps the state argument in a `Proxy` for change tracking. `structuredClone` cannot clone a Proxy and throws a `DataCloneError`. All snapshots are captured via `get().tasks` before entering `set()`:

```ts
// WRONG — crashes
set((state) => { state._snapshot = structuredClone(state.tasks) })

// CORRECT
const snapshot = structuredClone(get().tasks)
set((state) => { state._snapshot = snapshot })
```

### 2. Per-closure snapshots for concurrent operations

The store has a single `_snapshot` slot. If two operations ran concurrently, the second would overwrite the first's snapshot and a rollback would restore the wrong state. Each hook closure captures its own snapshot at call time and calls `restoreSnapshot(snapshot)` directly, bypassing the shared slot entirely.

### 3. `isBusyRef` guard in TaskModal

Optimistic mutations update the store instantly, which re-fires `useEffect([editingTask])` and would reset `isSubmitting` back to `false` while the API is still in-flight — making the loading spinner disappear immediately. A `useRef` flag suppresses the effect reset without causing extra renders (unlike `useState`):

```ts
const isBusyRef = useRef(false)
useEffect(() => {
  if (isBusyRef.current) return  // skip while API is in-flight
  // ... reset form state
}, [isOpen, isEdit, editingTask])
```

### 4. History only records committed reality

`pushHistory()` is called only inside the success branch, after `commitOptimistic()` confirms the API accepted the change. Rolled-back operations are never recorded. This means undo always restores to a state that actually existed — not a speculative one.

### 5. `enableMapSet()` in both `main.tsx` and `__tests__/setup.ts`

`loadingIds` is a `Set<string>`. Immer requires its MapSet plugin to handle `Set` and `Map` mutations. It must be called in every Immer entry point — both the app bootstrap and the test environment setup file — otherwise tests that touch `loadingIds` will throw at runtime.

---

## Performance

| Concern | Implementation |
|---|---|
| `TaskCard` re-renders | `React.memo` + `useShallow` selector — card only re-renders when its own task object changes |
| Filter computation | `useMemo` in `useFilteredTasks` with `[tasks, filters]` deps — runs once per filter change, not per render |
| Search keystroke overhead | 300ms debounce in `SearchInput` — store is only updated after the user stops typing |
| 1000+ tasks in DOM | TanStack Virtual — ~15 DOM nodes rendered per column at any time via `measureElement` (supports dynamic card heights) |
| Drag performance | CSS `transition: transform 150ms ease` on card wrappers — no JS animation loop |
| Framer Motion scope | Only used on `DragOverlay`, modals, and toast entries. Explicitly excluded from list items — animating 1000 cards simultaneously triggers mass layout recalculation |
| Snapshot copies | `structuredClone` — faster and correct with `Date`/`Set`/`Map`. `JSON.parse(JSON.stringify(...))` would silently corrupt `Set` values |

---

## Testing

**Run tests:**

```bash
npx vitest run          # single run, CI mode
npx vitest              # watch mode
npx vitest --ui         # browser UI
npx tsc --noEmit        # type-check only (0 errors)
```

**50 tests across 4 files:**

| File | Tests | What is covered |
|---|---|---|
| `__tests__/taskSlice.test.ts` | 14 | `optimisticMove`, `optimisticAdd`, `optimisticUpdate`, `optimisticDelete`, `commitOptimistic`, `rollbackOptimistic`, concurrent op isolation |
| `__tests__/historySlice.test.ts` | 12 | `pushHistory`, `undo`, `redo`, 50-entry cap (oldest dropped), multi-step undo/redo sequences, `future` cleared on new action |
| `__tests__/useFilteredTasks.test.ts` | 10 | No filter (all tasks), search by title, search by description, filter by assignee, filter by priority, filter by single tag, AND logic across multiple tags, combined filter + search |
| `__tests__/useUndoRedo.test.ts` | 14 | `Ctrl+Z`, `Cmd+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`, suppression inside `<input>` and `<textarea>`, event listener cleanup on unmount |

`taskMatchesFilters` is exported as a pure function from `useFilteredTasks.ts` and tested directly — no `renderHook` needed for the filter logic.
