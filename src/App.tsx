import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, TaskInput, Priority } from '@/types/task';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  CalendarDays,
  ListTodo,
  Loader2,
  AlertCircle,
  Pencil,
  X,
  Search,
  Flame,
  Equal,
  ArrowDown,
  Filter,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'completed';
type PriorityFilter = 'all' | Priority;

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'No deadline';
  const date = new Date(deadline);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDeadlineStatus(deadline: string | null, completed: boolean): 'overdue' | 'soon' | 'normal' | 'none' {
  if (!deadline || completed) return 'none';
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) return 'overdue';
  if (diffHours < 24) return 'soon';
  return 'normal';
}

function PriorityBadge({ priority, size = 'sm' }: { priority: Priority; size?: 'sm' | 'xs' }) {
  const config = {
    high: {
      icon: Flame,
      classes: 'bg-red-50 text-red-700 border-red-200',
      label: 'High',
    },
    medium: {
      icon: Equal,
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Medium',
    },
    low: {
      icon: ArrowDown,
      classes: 'bg-sky-50 text-sky-700 border-sky-200',
      label: 'Low',
    },
  };

  const { icon: Icon, classes, label } = config[priority];
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px] gap-1' : 'px-2 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${classes} ${sizeClasses}`}>
      <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
      {label}
    </span>
  );
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [saving, setSaving] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load tasks. Please try again.');
      setTasks([]);
    } else {
      setError(null);
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
    setEditingTask(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDeadline(task.deadline ? task.deadline.slice(0, 16) : '');
    setPriority(task.priority);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const payload: TaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
    };

    let result;
    if (editingTask) {
      result = await supabase.from('tasks').update(payload).eq('id', editingTask.id).select();
    } else {
      result = await supabase.from('tasks').insert(payload).select();
    }

    setSaving(false);

    if (result.error) {
      setError(editingTask ? 'Failed to update task.' : 'Failed to add task.');
      return;
    }

    resetForm();
    await fetchTasks();
  };

  const toggleComplete = async (task: Task) => {
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id);

    if (updateError) {
      setError('Failed to update task status.');
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = async (task: Task) => {
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);

    if (deleteError) {
      setError('Failed to delete task.');
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  // Filtered + searched tasks
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (statusFilter === 'pending' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (query) {
          const haystack = (t.title + ' ' + (t.description || '')).toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Pending first, then by priority, then by created date
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const overdueCount = pendingTasks.filter(
    (t) => getDeadlineStatus(t.deadline, t.completed) === 'overdue'
  ).length;

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Study Tasks</h1>
              <p className="text-xs text-slate-500">Stay on top of your deadlines</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 sm:px-6 sm:py-8">
        {/* Stats bar */}
        {!loading && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{pendingTasks.length}</p>
              <p className="text-xs font-medium text-slate-500">Pending</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-emerald-600">{completedTasks.length}</p>
              <p className="text-xs font-medium text-slate-500">Completed</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {overdueCount}
              </p>
              <p className="text-xs font-medium text-slate-500">Overdue</p>
            </div>
          </div>
        )}

        {/* Search & Filter bar */}
        {!loading && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or description..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filter:</span>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                {([
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Done' },
                ] as { value: StatusFilter; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === opt.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Priority filter */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                {([
                  { value: 'all', label: 'All' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Med' },
                  { value: 'low', label: 'Low' },
                ] as { value: PriorityFilter; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPriorityFilter(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      priorityFilter === opt.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading your tasks...</p>
          </div>
        )}

        {/* Task form modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={resetForm}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTask ? 'Edit Task' : 'New Task'}
                </h2>
                <button
                  onClick={resetForm}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Finish calculus homework"
                    required
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'high', label: 'High', icon: Flame, classes: 'border-red-300 bg-red-50 text-red-700' },
                      { value: 'medium', label: 'Medium', icon: Equal, classes: 'border-amber-300 bg-amber-50 text-amber-700' },
                      { value: 'low', label: 'Low', icon: ArrowDown, classes: 'border-sky-300 bg-sky-50 text-sky-700' },
                    ] as { value: Priority; label: string; icon: typeof Flame; classes: string }[]).map((opt) => {
                      const Icon = opt.icon;
                      const selected = priority === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPriority(opt.value)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                            selected
                              ? `${opt.classes} ring-2 ring-offset-1 ring-blue-500/30`
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingTask ? 'Save' : 'Add Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task lists */}
        {!loading && (
          <>
            {filteredTasks.length === 0 && hasActiveFilters ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-12 text-center">
                <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No tasks match your search or filters.</p>
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Pending section */}
                {(statusFilter === 'all' || statusFilter === 'pending') && (
                  <section className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <h2 className="text-base font-bold text-slate-900">Pending</h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        {pendingTasks.length}
                      </span>
                    </div>

                    {pendingTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-10 text-center">
                        <Circle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No pending tasks. You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pendingTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={toggleComplete}
                            onDelete={deleteTask}
                            onEdit={openEditForm}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Completed section */}
                {(statusFilter === 'all' || statusFilter === 'completed') && (
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <h2 className="text-base font-bold text-slate-900">Completed</h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {completedTasks.length}
                      </span>
                    </div>

                    {completedTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-10 text-center">
                        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No completed tasks yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {completedTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={toggleComplete}
                            onDelete={deleteTask}
                            onEdit={openEditForm}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
}

function TaskCard({ task, onToggle, onDelete, onEdit }: TaskCardProps) {
  const deadlineStatus = getDeadlineStatus(task.deadline, task.completed);

  const deadlineBadgeClass =
    deadlineStatus === 'overdue'
      ? 'bg-red-50 text-red-700 border-red-200'
      : deadlineStatus === 'soon'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <div
      className={`group rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        task.completed ? 'border-slate-200 opacity-75' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle button */}
        <button
          onClick={() => onToggle(task)}
          className={`mt-0.5 shrink-0 transition-all active:scale-90 ${
            task.completed ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500'
          }`}
          aria-label={task.completed ? 'Mark as pending' : 'Mark as completed'}
        >
          {task.completed ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold ${
              task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p
              className={`mt-1 text-sm ${
                task.completed ? 'text-slate-400 line-through' : 'text-slate-600'
              }`}
            >
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} size="xs" />

            {task.deadline && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${deadlineBadgeClass}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDeadline(task.deadline)}
                {deadlineStatus === 'overdue' && <span className="font-bold">· Overdue</span>}
                {deadlineStatus === 'soon' && <span className="font-bold">· Due soon</span>}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100 sm:group-hover:opacity-100 max-sm:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
            aria-label="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(task)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
