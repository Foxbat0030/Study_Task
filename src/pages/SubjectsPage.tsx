import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Subject, SubjectInput, Course } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState, EmptyState, inputClass, Field } from './TasksPage';
import { Library, Plus, Search, X, Pencil, Trash2 } from 'lucide-react';

const emptyForm: SubjectInput = {
  subject_code: '', name: '', course_id: '', semester: 1, credits: 3, faculty: '',
};

export function SubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects] = useState<(Subject & { course_name?: string; course_code?: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const fetchData = useCallback(async () => {
    const [subRes, courseRes] = await Promise.all([
      supabase.from('subjects').select('*, courses(name, course_id)').order('subject_code'),
      supabase.from('courses').select('*').order('name'),
    ]);
    if (subRes.error) { toast.show('error', 'Failed to load subjects.'); }
    else {
      const mapped = (subRes.data as any[]).map(s => ({
        ...s, course_name: s.courses?.name, course_code: s.courses?.course_id,
      }));
      setSubjects(mapped);
    }
    if (courseRes.data) setCourses(courseRes.data as Course[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { setForm(emptyForm); setEditing(null); setShowForm(false); };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, course_id: courses[0]?.id || '' }); setShowForm(true); };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ subject_code: s.subject_code, name: s.name, course_id: s.course_id, semester: s.semester, credits: s.credits, faculty: s.faculty });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject_code.trim() || !form.name.trim() || !form.course_id) return;
    setSaving(true);
    const result = editing
      ? await supabase.from('subjects').update(form).eq('id', editing.id).select()
      : await supabase.from('subjects').insert(form).select();
    setSaving(false);
    if (result.error) { toast.show('error', editing ? 'Failed to update subject.' : 'Failed to add subject.'); return; }
    toast.show('success', editing ? 'Subject updated successfully.' : 'Subject added successfully.');
    resetForm(); await fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('subjects').delete().eq('id', deleteTarget.id);
    if (error) { toast.show('error', 'Failed to delete subject.'); }
    else { toast.show('success', 'Subject deleted.'); setSubjects(prev => prev.filter(s => s.id !== deleteTarget.id)); }
    setDeleteTarget(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter(s => {
      if (courseFilter !== 'all' && s.course_id !== courseFilter) return false;
      if (q && !(s.subject_code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.faculty.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [subjects, search, courseFilter]);

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subject Management</h2>
          <p className="text-sm text-slate-500">{subjects.length} subjects across {courses.length} courses</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Subject</Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by code, name, or faculty..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
          <option value="all">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.course_id} — {c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Library} message={search || courseFilter !== 'all' ? 'No subjects match your search.' : 'No subjects yet. Click "Add Subject" to get started.'} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Subject Name</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 md:table-cell">Course</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">Sem</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">Credits</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 lg:table-cell">Faculty</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{s.subject_code}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{s.course_code || '—'}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{s.semester}</td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{s.credits}</td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{s.faculty}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showForm} title={editing ? 'Edit Subject' : 'Add Subject'} onClose={resetForm}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Subject Code" required>
            <input type="text" value={form.subject_code} onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} required className={inputClass} placeholder="CS101" />
          </Field>
          <Field label="Subject Name" required>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} placeholder="Programming in C" />
          </Field>
          <Field label="Course" required>
            <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} required className={inputClass}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_id} — {c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Semester">
              <input type="number" min={1} max={20} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))} className={inputClass} />
            </Field>
            <Field label="Credits">
              <input type="number" min={1} max={10} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))} className={inputClass} />
            </Field>
            <Field label="Faculty">
              <input type="text" value={form.faculty} onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))} className={inputClass} placeholder="Dr. Smith" />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} disabled={!form.subject_code.trim() || !form.name.trim() || !form.course_id} className="flex-1">
              {!saving && <Plus className="h-4 w-4" />}{editing ? 'Save Changes' : 'Add Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete Subject" message={`Are you sure you want to delete "${deleteTarget?.name}"? All related student enrollments, attendance, marks, and assignments will also be removed. This cannot be undone.`}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
