import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, TaskInput, Priority } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  CheckCircle2, Circle, Clock, Plus, Trash2, CalendarDays, Loader2, Pencil, X,
  Search, Flame, Equal, ArrowDown, Filter,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'completed';
type PriorityFilter = 'all' | Priority;

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'No deadline';
  const date = new Date(deadline);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getDeadlineStatus(deadline: string | null, completed: boolean): 'overdue' | 'soon' | 'normal' | 'none' {
  if (!deadline || completed) return 'none';
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs < 0) return 'overdue';
  if (diffMs / 3.6e6 < 24) return 'soon';
  return 'normal';
}

export function TasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.show('error', 'Failed to load tasks.');
      setTasks([]);
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setDeadline(''); setPriority('medium');
    setEditingTask(null); setShowForm(false);
  };

  const openCreate = () => { setEditingTask(null); setTitle(''); setDescription(''); setDeadline(''); setPriority('medium'); setShowForm(true); };
  const openEdit = (task: Task) => {
    setEditingTask(task); setTitle(task.title); setDescription(task.description || '');
    setDeadline(task.deadline ? task.deadline.slice(0, 16) : ''); setPriority(task.priority); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const payload: TaskInput = {
      title: title.trim(), description: description.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null, priority,
    };
    const result = editingTask
      ? await supabase.from('tasks').update(payload).eq('id', editingTask.id).select()
      : await supabase.from('tasks').insert(payload).select();
    setSaving(false);
    if (result.error) { toast.show('error', editingTask ? 'Failed to update task.' : 'Failed to add task.'); return; }
    toast.show('success', editingTask ? 'Task updated successfully.' : 'Task added successfully.');
    resetForm(); await fetchTasks();
  };

  const toggleComplete = async (task: Task) => {
    const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    if (error) { toast.show('error', 'Failed to update task status.'); return; }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('tasks').delete().eq('id', deleteTarget.id);
    if (error) { toast.show('error', 'Failed to delete task.'); }
    else { toast.show('success', 'Task deleted.'); setTasks(prev => prev.filter(t => t.id !== deleteTarget.id)); }
    setDeleteTarget(null);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter(t => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (q && !(t.title + ' ' + (t.description || '')).toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const pending = filtered.filter(t => !t.completed);
  const completed = filtered.filter(t => t.completed);
  const overdue = pending.filter(t => getDeadlineStatus(t.deadline, t.completed) === 'overdue').length;
  const hasFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || priorityFilter !== 'all';
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setPriorityFilter('all'); };

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard value={pending.length} label="Pending" />
        <StatCard value={completed.length} label="Completed" color="text-emerald-600" />
        <StatCard value={overdue} label="Overdue" color={overdue > 0 ? 'text-red-600' : 'text-slate-900'} />
      </div>

      {/* Search & Filter */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks..." className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
          hasFilters={hasFilters} onClear={clearFilters} />
      </div>

      {/* Add button */}
      <div className="mb-4">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Task</Button>
      </div>

      {/* Task form modal */}
      <Modal open={showForm} title={editingTask ? 'Edit Task' : 'New Task'} onClose={resetForm}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" required>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus
              placeholder="e.g. Finish calculus homework" className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Optional details..." className={`${inputClass} resize-none`} />
          </Field>
          <Field label="Priority">
            <div className="grid grid-cols-3 gap-2">
              {([['high','High',Flame,'border-red-300 bg-red-50 text-red-700'],['medium','Medium',Equal,'border-amber-300 bg-amber-50 text-amber-700'],['low','Low',ArrowDown,'border-sky-300 bg-sky-50 text-sky-700']] as const).map(([val,label,Icon,cls]) => (
                <button key={val} type="button" onClick={() => setPriority(val)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${priority===val?`${cls} ring-2 ring-offset-1 ring-blue-500/30`:'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Deadline">
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} disabled={!title.trim()} className="flex-1">
              {!saving && <Plus className="h-4 w-4" />}{editingTask ? 'Save' : 'Add Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteTarget} title="Delete Task" message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      {/* Lists */}
      {filtered.length === 0 && hasFilters ? (
        <EmptyState icon={Search} message="No tasks match your search or filters." action={<button onClick={clearFilters} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Clear all filters</button>} />
      ) : (
        <>
          <TaskSection title="Pending" icon={Clock} iconColor="text-amber-500" count={pending.length} badge="bg-amber-100 text-amber-700"
            tasks={pending} show={statusFilter==='all'||statusFilter==='pending'} onToggle={toggleComplete} onEdit={openEdit} onDelete={setDeleteTarget}
            empty={<EmptyState icon={Circle} message="No pending tasks. You're all caught up!" />} />
          <TaskSection title="Completed" icon={CheckCircle2} iconColor="text-emerald-500" count={completed.length} badge="bg-emerald-100 text-emerald-700"
            tasks={completed} show={statusFilter==='all'||statusFilter==='completed'} onToggle={toggleComplete} onEdit={openEdit} onDelete={setDeleteTarget}
            empty={<EmptyState icon={CheckCircle2} message="No completed tasks yet." />} />
        </>
      )}
    </div>
  );
}

// --- Shared UI pieces ---

const inputClass = 'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}

function StatCard({ value, label, color = 'text-slate-900' }: { value: number; label: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function FilterBar({ statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, hasFilters, onClear }: {
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void;
  priorityFilter: PriorityFilter; setPriorityFilter: (v: PriorityFilter) => void;
  hasFilters: boolean; onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Filter className="h-3.5 w-3.5" /><span className="hidden sm:inline">Filter:</span></div>
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
        {([['all','All'],['pending','Pending'],['completed','Done']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter===v?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100'}`}>{l}</button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
        {([['all','All'],['high','High'],['medium','Med'],['low','Low']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setPriorityFilter(v)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${priorityFilter===v?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100'}`}>{l}</button>
        ))}
      </div>
      {hasFilters && <button onClick={onClear} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X className="h-3 w-3" />Clear</button>}
    </div>
  );
}

function TaskSection({ title, icon: Icon, iconColor, count, badge, tasks, show, onToggle, onEdit, onDelete, empty }: {
  title: string; icon: typeof Clock; iconColor: string; count: number; badge: string;
  tasks: Task[]; show: boolean; onToggle: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (t: Task) => void; empty: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>{count}</span>
      </div>
      {tasks.length === 0 ? empty : (
        <div className="space-y-2.5">
          {tasks.map(task => <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </section>
  );
}

function TaskCard({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: (t: Task)=>void; onEdit: (t: Task)=>void; onDelete: (t: Task)=>void }) {
  const ds = getDeadlineStatus(task.deadline, task.completed);
  const dlClass = ds==='overdue'?'bg-red-50 text-red-700 border-red-200':ds==='soon'?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-50 text-slate-600 border-slate-200';
  const pConfig = { high: { Icon: Flame, cls: 'bg-red-50 text-red-700 border-red-200' }, medium: { Icon: Equal, cls: 'bg-amber-50 text-amber-700 border-amber-200' }, low: { Icon: ArrowDown, cls: 'bg-sky-50 text-sky-700 border-sky-200' } };
  const { Icon: PIcon, cls: pCls } = pConfig[task.priority];

  return (
    <div className={`group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md ${task.completed?'opacity-75':''}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(task)} className={`mt-0.5 shrink-0 transition-all active:scale-90 ${task.completed?'text-emerald-600':'text-slate-300 hover:text-emerald-500'}`}>
          {task.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold ${task.completed?'text-slate-400 line-through':'text-slate-900'}`}>{task.title}</h3>
          {task.description && <p className={`mt-1 text-sm ${task.completed?'text-slate-400 line-through':'text-slate-600'}`}>{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${pCls}`}><PIcon className="mr-1 h-2.5 w-2.5" />{task.priority.charAt(0).toUpperCase()+task.priority.slice(1)}</span>
            {task.deadline && (
              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${dlClass}`}>
                <CalendarDays className="h-3.5 w-3.5" />{formatDeadline(task.deadline)}
                {ds==='overdue'&&<span className="font-bold">· Overdue</span>}{ds==='soon'&&<span className="font-bold">· Due soon</span>}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button onClick={() => onEdit(task)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(task)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="mt-3 text-sm text-slate-500">Loading...</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, message, action }: { icon: typeof Circle; message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-10 text-center">
      <Icon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { inputClass, Field, StatCard, EmptyState, LoadingState };
