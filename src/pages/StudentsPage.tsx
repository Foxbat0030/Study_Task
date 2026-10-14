import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student, StudentInput, Course } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState, EmptyState, inputClass, Field } from './TasksPage';
import { Users, Plus, Search, X, Pencil, Trash2, Eye, UserPlus } from 'lucide-react';

interface StudentsPageProps {
  onViewProfile: (studentId: string) => void;
}

export function StudentsPage({ onViewProfile }: StudentsPageProps) {
  const toast = useToast();
  const [students, setStudents] = useState<(Student & { course_name?: string; course_code?: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<StudentInput>({
    student_id: '', enrollment_number: '', name: '', email: '', phone: '',
    date_of_birth: '', gender: 'male', address: '', course_id: '', semester: 1, section: 'A', photo_url: '',
  });

  const fetchData = useCallback(async () => {
    const [studentsRes, coursesRes] = await Promise.all([
      supabase.from('students').select('*, courses(name, course_id)').order('created_at', { ascending: false }),
      supabase.from('courses').select('*').order('name'),
    ]);
    if (studentsRes.error) { toast.show('error', 'Failed to load students.'); }
    else {
      const mapped = (studentsRes.data as any[]).map(s => ({
        ...s, course_name: s.courses?.name, course_code: s.courses?.course_id,
      }));
      setStudents(mapped);
    }
    if (coursesRes.data) setCourses(coursesRes.data as Course[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ student_id: '', enrollment_number: '', name: '', email: '', phone: '', date_of_birth: '', gender: 'male', address: '', course_id: '', semester: 1, section: 'A', photo_url: '' });
    setEditing(null); setShowForm(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ student_id: '', enrollment_number: '', name: '', email: '', phone: '', date_of_birth: '', gender: 'male', address: '', course_id: courses[0]?.id || '', semester: 1, section: 'A', photo_url: '' });
    setShowForm(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      student_id: s.student_id, enrollment_number: s.enrollment_number, name: s.name, email: s.email,
      phone: s.phone || '', date_of_birth: s.date_of_birth || '', gender: s.gender || 'male',
      address: s.address || '', course_id: s.course_id || '', semester: s.semester, section: s.section || 'A',
      photo_url: s.photo_url || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.student_id.trim() || !form.email.trim()) return;
    setSaving(true);
    const payload: StudentInput = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      course_id: form.course_id || null,
      photo_url: form.photo_url || null,
      phone: form.phone || null,
      address: form.address || null,
    };
    const result = editing
      ? await supabase.from('students').update(payload).eq('id', editing.id).select()
      : await supabase.from('students').insert(payload).select();
    setSaving(false);
    if (result.error) { toast.show('error', editing ? 'Failed to update student.' : 'Failed to add student.'); return; }
    toast.show('success', editing ? 'Student updated successfully.' : 'Student added successfully.');
    resetForm(); await fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('students').delete().eq('id', deleteTarget.id);
    if (error) { toast.show('error', 'Failed to delete student.'); }
    else { toast.show('success', 'Student deleted.'); setStudents(prev => prev.filter(s => s.id !== deleteTarget.id)); }
    setDeleteTarget(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) ||
      s.enrollment_number.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, search]);

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">All Students</h2>
          <p className="text-sm text-slate-500">{students.length} students enrolled</p>
        </div>
        <Button onClick={openCreate}><UserPlus className="h-4 w-4" /> Add Student</Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, enrollment number, or email..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} message={search ? 'No students match your search.' : 'No students yet. Click "Add Student" to get started.'} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Student ID</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 md:table-cell">Course</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">Sem</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{s.name}</p>
                          <p className="truncate text-xs text-slate-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{s.student_id}</p>
                      <p className="text-xs text-slate-400">{s.enrollment_number}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{s.course_code || '—'}</span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-slate-700">{s.semester}</span>
                      {s.section && <span className="ml-1 text-xs text-slate-400">· {s.section}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onViewProfile(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="View"><Eye className="h-4 w-4" /></button>
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

      {/* Form modal */}
      <Modal open={showForm} title={editing ? 'Edit Student' : 'Add Student'} onClose={resetForm} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Student ID" required>
              <input type="text" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required className={inputClass} placeholder="STU001" />
            </Field>
            <Field label="Enrollment Number" required>
              <input type="text" value={form.enrollment_number} onChange={e => setForm(f => ({ ...f, enrollment_number: e.target.value }))} required className={inputClass} placeholder="ENR2023BCA001" />
            </Field>
            <Field label="Full Name" required>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} placeholder="John Doe" />
            </Field>
            <Field label="Email" required>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className={inputClass} placeholder="john@college.edu" />
            </Field>
            <Field label="Phone">
              <input type="text" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="+91-9876543210" />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={form.date_of_birth || ''} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Gender">
              <select value={form.gender || 'male'} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inputClass}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Course">
              <select value={form.course_id || ''} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} className={inputClass}>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_id} — {c.name}</option>)}
              </select>
            </Field>
            <Field label="Semester">
              <input type="number" min={1} max={10} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))} className={inputClass} />
            </Field>
            <Field label="Section">
              <input type="text" value={form.section || ''} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className={inputClass} placeholder="A" />
            </Field>
          </div>
          <Field label="Address">
            <textarea value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="Street, City, State" />
          </Field>
          <Field label="Photo URL">
            <input type="text" value={form.photo_url || ''} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} disabled={!form.name.trim() || !form.student_id.trim() || !form.email.trim()} className="flex-1">
              {!saving && <Plus className="h-4 w-4" />}{editing ? 'Save Changes' : 'Add Student'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete Student" message={`Are you sure you want to delete "${deleteTarget?.name}"? All related attendance, marks, and assignments will also be removed. This cannot be undone.`}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
