import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Course, CourseInput } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState, EmptyState, inputClass, Field } from './TasksPage';
import { BookOpen, Plus, Search, X, Pencil, Trash2, PencilLine } from 'lucide-react';

const emptyForm: CourseInput = {
  course_id: '', name: '', department: '', duration_years: 3, num_semesters: 6,
};

export function CoursesPage() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    const { data, error } = await supabase.from('courses').select('*').order('name');
    if (error) { toast.show('error', 'Failed to load courses.'); }
    else { setCourses(data as Course[]); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const resetForm = () => { setForm(emptyForm); setEditing(null); setShowForm(false); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({ course_id: c.course_id, name: c.name, department: c.department, duration_years: c.duration_years, num_semesters: c.num_semesters });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id.trim() || !form.name.trim()) return;
    setSaving(true);
    const result = editing
      ? await supabase.from('courses').update(form).eq('id', editing.id).select()
      : await supabase.from('courses').insert(form).select();
    setSaving(false);
    if (result.error) { toast.show('error', editing ? 'Failed to update course.' : 'Failed to add course.'); return; }
    toast.show('success', editing ? 'Course updated successfully.' : 'Course added successfully.');
    resetForm(); await fetchCourses();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('courses').delete().eq('id', deleteTarget.id);
    if (error) { toast.show('error', 'Failed to delete course. It may have subjects or students assigned.'); }
    else { toast.show('success', 'Course deleted.'); setCourses(prev => prev.filter(c => c.id !== deleteTarget.id)); }
    setDeleteTarget(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c =>
      c.course_id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q)
    );
  }, [courses, search]);

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Course Management</h2>
          <p className="text-sm text-slate-500">{courses.length} courses available</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Course</Button>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by course ID, name, or department..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} message={search ? 'No courses match your search.' : 'No courses yet. Click "Add Course" to get started.'} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">Course ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Course Name</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 md:table-cell">Department</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">Duration</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">Semesters</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{c.course_id}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{c.department}</td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{c.duration_years} years</td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{c.num_semesters}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showForm} title={editing ? 'Edit Course' : 'Add Course'} onClose={resetForm}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Course ID" required>
            <input type="text" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} required className={inputClass} placeholder="BCA" />
          </Field>
          <Field label="Course Name" required>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} placeholder="Bachelor of Computer Applications" />
          </Field>
          <Field label="Department" required>
            <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} required className={inputClass} placeholder="Computer Science" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (Years)">
              <input type="number" min={1} max={10} value={form.duration_years} onChange={e => setForm(f => ({ ...f, duration_years: Number(e.target.value) }))} className={inputClass} />
            </Field>
            <Field label="Number of Semesters">
              <input type="number" min={1} max={20} value={form.num_semesters} onChange={e => setForm(f => ({ ...f, num_semesters: Number(e.target.value) }))} className={inputClass} />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} disabled={!form.course_id.trim() || !form.name.trim()} className="flex-1">
              {!saving && <Plus className="h-4 w-4" />}{editing ? 'Save Changes' : 'Add Course'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete Course" message={`Are you sure you want to delete "${deleteTarget?.name}"? All subjects and student enrollments under this course will also be removed. This cannot be undone.`}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
