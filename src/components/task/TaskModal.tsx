/**
 * TaskModal — create and edit modal for task cards.
 *
 * Controlled entirely by the store's openModalId:
 *   - null      → modal is closed (nothing rendered)
 *   - 'new'     → create mode (blank form, no task pre-filled)
 *   - <task id> → edit mode   (form pre-filled with task data, delete button visible)
 *
 * Optimistic update flow (CLAUDE.md §1):
 *   Submit → optimisticXxx() → api.xxx() → commitOptimistic + pushHistory | rollbackOptimistic
 *
 * All API calls are delegated to useOptimisticTask which owns the full lifecycle.
 *
 * Form validation rules:
 *   - title: required, 1–120 characters
 *   - description: optional, max 500 characters
 *   - status: required enum ('todo' | 'in-progress' | 'done')
 *   - priority: required enum ('low' | 'medium' | 'high')
 *   - assignee: required, 1–60 characters
 *   - tags: optional, comma-separated, each tag max 30 chars, max 10 tags
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { Loader2, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { useOptimisticTask } from '@/hooks/useOptimisticTask'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Status, Priority, Task } from '@/types'

// ─── Form shape ───────────────────────────────────────────────────────────────

interface TaskFormValues {
  title: string
  description: string
  status: Status
  priority: Priority
  assignee: string
  tagsRaw: string   // comma-separated string, parsed on submit
}

interface FormErrors {
  title?: string
  description?: string
  assignee?: string
  tags?: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_FORM: TaskFormValues = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee: '',
  tagsRaw: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function taskToForm(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    tagsRaw: task.tags.join(', '),
  }
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function validateForm(values: TaskFormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  } else if (values.title.trim().length > 120) {
    errors.title = 'Title must be 120 characters or fewer.'
  }

  if (values.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (!values.assignee.trim()) {
    errors.assignee = 'Assignee is required.'
  } else if (values.assignee.trim().length > 60) {
    errors.assignee = 'Assignee must be 60 characters or fewer.'
  }

  const tags = parseTags(values.tagsRaw)
  if (tags.length > 10) {
    errors.tags = 'Maximum 10 tags allowed.'
  } else if (tags.some((t) => t.length > 30)) {
    errors.tags = 'Each tag must be 30 characters or fewer.'
  }

  return errors
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskModal() {
  const { openModalId, closeModal } = useStore(
    useShallow((s) => ({
      openModalId: s.openModalId,
      closeModal: s.closeModal,
    }))
  )

  const isCreate = openModalId === 'new'
  const isEdit = openModalId !== null && openModalId !== 'new'
  const isOpen = isCreate || isEdit

  // Read the task being edited (null in create mode)
  const editingTask = useStore(
    useShallow((s) => (isEdit ? (s.tasks[openModalId] ?? null) : null))
  )

  const { createTask, updateTask, deleteTask } = useOptimisticTask()

  // ── Local form state ────────────────────────────────────────────────────

  const [form, setForm] = useState<TaskFormValues>(DEFAULT_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Tracks whether an API call is currently in-flight.
  // A ref (not state) is used so the useEffect below can check it
  // synchronously without causing extra renders or triggering itself.
  const isBusyRef = useRef(false)

  // Sync form when modal opens / task changes.
  // Guard: skip the reset if an API call is in-flight — the optimistic mutation
  // will update editingTask immediately, which would otherwise re-trigger this
  // effect and reset isSubmitting/isDeleting to false prematurely.
  useEffect(() => {
    if (!isOpen) return
    if (isBusyRef.current) return  // ← the fix: ignore effect while busy
    if (isEdit && editingTask) {
      setForm(taskToForm(editingTask))
    } else if (isCreate) {
      setForm(DEFAULT_FORM)
    }
    setErrors({})
  }, [isOpen, isCreate, isEdit, editingTask])

  // ── Field helpers ────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      // Clear error on change
      setErrors((prev) => {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key as keyof FormErrors]
        return next
      })
    },
    []
  )

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const validationErrors = validateForm(form)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }

      const tags = parseTags(form.tagsRaw)
      isBusyRef.current = true
      setIsSubmitting(true)

      try {
        if (isCreate) {
          await createTask({
            title: form.title.trim(),
            description: form.description.trim(),
            status: form.status,
            priority: form.priority,
            assignee: form.assignee.trim(),
            tags,
          })
          closeModal()
        } else if (isEdit && editingTask) {
          await updateTask(
            editingTask.id,
            {
              title: form.title.trim(),
              description: form.description.trim(),
              status: form.status,
              priority: form.priority,
              assignee: form.assignee.trim(),
              tags,
            },
            editingTask.title
          )
          closeModal()
        }
      } finally {
        isBusyRef.current = false
        setIsSubmitting(false)
      }
    },
    [form, isCreate, isEdit, editingTask, createTask, updateTask, closeModal]
  )

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!editingTask) return
    isBusyRef.current = true
    setIsDeleting(true)
    try {
      const success = await deleteTask(editingTask.id, editingTask.title)
      if (success) closeModal()
    } finally {
      isBusyRef.current = false
      setIsDeleting(false)
    }
  }, [editingTask, deleteTask, closeModal])

  // ── Close guard ──────────────────────────────────────────────────────────

  // Prevent closing while a request is in-flight
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isBusyRef.current) closeModal()
    },
    [closeModal]
  )

  const isBusy = isSubmitting || isDeleting

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'New Task' : 'Edit Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* ── Title ── */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">
              Title <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="What needs to be done?"
              maxLength={120}
              disabled={isBusy}
              aria-required="true"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
              className={cn(errors.title && 'border-destructive focus-visible:ring-destructive')}
            />
            {errors.title && (
              <p id="task-title-error" className="text-xs text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          {/* ── Description ── */}
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Optional details…"
              maxLength={500}
              rows={3}
              disabled={isBusy}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'task-desc-error' : undefined}
              className={cn(
                'resize-none',
                errors.description && 'border-destructive focus-visible:ring-destructive'
              )}
            />
            <div className="flex justify-between items-start">
              {errors.description ? (
                <p id="task-desc-error" className="text-xs text-destructive">
                  {errors.description}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {form.description.length}/500
              </span>
            </div>
          </div>

          {/* ── Status + Priority (side by side) ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField('status', v as Status)}
                disabled={isBusy}
              >
                <SelectTrigger id="task-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setField('priority', v as Priority)}
                disabled={isBusy}
              >
                <SelectTrigger id="task-priority" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Assignee ── */}
          <div className="space-y-1.5">
            <Label htmlFor="task-assignee">
              Assignee <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="task-assignee"
              value={form.assignee}
              onChange={(e) => setField('assignee', e.target.value)}
              placeholder="Name of the person responsible"
              maxLength={60}
              disabled={isBusy}
              aria-required="true"
              aria-invalid={errors.assignee ? true : undefined}
              aria-describedby={errors.assignee ? 'task-assignee-error' : undefined}
              className={cn(errors.assignee && 'border-destructive focus-visible:ring-destructive')}
            />
            {errors.assignee && (
              <p id="task-assignee-error" className="text-xs text-destructive">
                {errors.assignee}
              </p>
            )}
          </div>

          {/* ── Tags ── */}
          <div className="space-y-1.5">
            <Label htmlFor="task-tags">Tags</Label>
            <Input
              id="task-tags"
              value={form.tagsRaw}
              onChange={(e) => setField('tagsRaw', e.target.value)}
              placeholder="design, backend, urgent  (comma-separated)"
              disabled={isBusy}
              aria-invalid={errors.tags ? true : undefined}
              aria-describedby={errors.tags ? 'task-tags-error' : 'task-tags-hint'}
              className={cn(errors.tags && 'border-destructive focus-visible:ring-destructive')}
            />
            {errors.tags ? (
              <p id="task-tags-error" className="text-xs text-destructive">
                {errors.tags}
              </p>
            ) : (
              <p id="task-tags-hint" className="text-xs text-muted-foreground">
                Separate tags with commas. Max 10 tags.
              </p>
            )}
          </div>

          {/* ── Footer ── */}
          <DialogFooter className="pt-2">
            {/* Delete button — only in edit mode */}
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isBusy}
                aria-label="Delete task"
                className="mr-auto"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="ml-1.5">{isDeleting ? 'Deleting…' : 'Delete'}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => !isBusy && closeModal()}
              disabled={isBusy}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isBusy}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  {isCreate ? 'Creating…' : 'Saving…'}
                </>
              ) : (
                isCreate ? 'Create task' : 'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
