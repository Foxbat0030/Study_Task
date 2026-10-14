import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student, Course, Subject, Attendance, Marks, Assignment, ProfileTab } from '@/types';
import { computeGrade, computeOverallMarks } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingState, inputClass, Field } from './TasksPage';
import {
  ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, User, IdCard, BookOpen,
  GraduationCap, Users, CheckCircle2, Clock, XCircle, FileText, Award, TrendingUp,
} from 'lucide-react';

interface StudentProfilePageProps {
  studentId: string;
  onBack: () => void;
}

export function StudentProfilePage({ studentId, onBack }: StudentProfilePageProps) {
  const toast = useToast();
  const [student, setStudent] = useState<(Student & { course_name?: string; course_code?: string; department?: string }) | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [marks, setMarks] = useState<Marks[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  const fetchAll = useCallback(async () => {
    const [stuRes, subRes, attRes, marksRes, assignRes] = await Promise.all([
      supabase.from('students').select('*, courses(name, course_id, department)').eq('id', studentId).maybeSingle(),
      supabase.from('student_subjects').select('subject_id, subjects(*)').eq('student_id', studentId),
      supabase.from('attendance').select('*').eq('student_id', studentId).order('date', { ascending: false }),
      supabase.from('marks').select('*').eq('student_id', studentId),
      supabase.from('assignments').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
    ]);

    if (stuRes.data) {
      const s = stuRes.data as any;
      setStudent({ ...s, course_name: s.courses?.name, course_code: s.courses?.course_id, department: s.courses?.department });
    }
    if (subRes.data) setSubjects((subRes.data as any[]).map(r => r.subjects as Subject));
    if (attRes.data) setAttendance(attRes.data as Attendance[]);
    if (marksRes.data) setMarks(marksRes.data as Marks[]);
    if (assignRes.data) setAssignments(assignRes.data as Assignment[]);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach(s => m.set(s.id, s));
    return m;
  }, [subjects]);

  const overallPct = useMemo(() => computeOverallMarks(marks), [marks]);
  const grade = useMemo(() => computeGrade(overallPct), [overallPct]);

  const attendanceStats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, pct };
  }, [attendance]);

  const perSubjectAttendance = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    attendance.forEach(a => {
      const cur = map.get(a.subject_id) || { present: 0, total: 0 };
      cur.total++;
      if (a.status === 'present') cur.present++;
      map.set(a.subject_id, cur);
    });
    return map;
  }, [attendance]);

  const openEdit = () => {
    if (!student) return;
    setEditForm({
      name: student.name, email: student.email, phone: student.phone, date_of_birth: student.date_of_birth,
      gender: student.gender, address: student.address, semester: student.semester, section: student.section, photo_url: student.photo_url,
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    const { error } = await supabase.from('students').update({
      name: editForm.name, email: editForm.email, phone: editForm.phone || null,
      date_of_birth: editForm.date_of_birth || null, gender: editForm.gender || null,
      address: editForm.address || null, semester: editForm.semester || 1, section: editForm.section || null,
      photo_url: editForm.photo_url || null,
    }).eq('id', student.id);
    setSaving(false);
    if (error) { toast.show('error', 'Failed to update profile.'); return; }
    toast.show('success', 'Profile updated successfully.');
    setShowEdit(false); await fetchAll();
  };

  if (loading) return <LoadingState />;
  if (!student) return (
    <div className="mx-auto max-w-4xl">
      <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
      <p className="mt-8 text-center text-sm text-slate-500">Student not found.</p>
    </div>
  );

  const tabs: { id: ProfileTab; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'marks', label: 'Marks', icon: Award },
    { id: 'subjects', label: 'Subjects', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back button */}
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Students
      </button>

      {/* Profile header card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-500" />
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.name}
                  className="-mt-12 h-24 w-24 rounded-xl border-4 border-white object-cover shadow-md" />
              ) : (
                <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-xl border-4 border-white bg-slate-200 text-2xl font-bold text-slate-500 shadow-md">
                  {student.name.charAt(0)}
                </div>
              )}
              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
                <p className="text-sm text-slate-500">{student.course_code} · {student.course_name}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={openEdit}><Pencil className="h-4 w-4" /> Edit Profile</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab===tab.id?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab student={student} subjects={subjects} marks={marks} attendance={attendance} assignments={assignments} overallPct={overallPct} grade={grade} attendanceStats={attendanceStats} subjectMap={subjectMap} />}
      {activeTab === 'attendance' && <AttendanceTab attendance={attendance} subjectMap={subjectMap} perSubjectAttendance={perSubjectAttendance} stats={attendanceStats} />}
      {activeTab === 'marks' && <MarksTab marks={marks} subjectMap={subjectMap} overallPct={overallPct} grade={grade} />}
      {activeTab === 'subjects' && <SubjectsTab subjects={subjects} />}
      {activeTab === 'assignments' && <AssignmentsTab assignments={assignments} subjectMap={subjectMap} />}

      {/* Edit modal */}
      <Modal open={showEdit} title="Edit Profile" onClose={() => setShowEdit(false)} maxWidth="max-w-2xl">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <input type="text" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} />
            </Field>
            <Field label="Email" required>
              <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required className={inputClass} />
            </Field>
            <Field label="Phone">
              <input type="text" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={editForm.date_of_birth || ''} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Gender">
              <select value={editForm.gender || 'male'} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} className={inputClass}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Semester">
              <input type="number" min={1} max={10} value={editForm.semester || 1} onChange={e => setEditForm(f => ({ ...f, semester: Number(e.target.value) }))} className={inputClass} />
            </Field>
            <Field label="Section">
              <input type="text" value={editForm.section || ''} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Photo URL">
              <input type="text" value={editForm.photo_url || ''} onChange={e => setEditForm(f => ({ ...f, photo_url: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Address">
            <textarea value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- Tab components ---

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );
}

function OverviewTab({ student, subjects, marks, assignments, overallPct, grade, attendanceStats, subjectMap }: {
  student: Student & { course_name?: string; course_code?: string; department?: string };
  subjects: Subject[]; marks: Marks[]; assignments: Assignment[];
  overallPct: number; grade: string; attendanceStats: { total: number; present: number; absent: number; late: number; pct: number };
  subjectMap: Map<string, Subject>;
}) {
  const submittedAssignments = assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Student information */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Student Information</h3>
        <div className="divide-y divide-slate-100">
          <InfoRow icon={IdCard} label="Student ID" value={student.student_id} />
          <InfoRow icon={IdCard} label="Enrollment Number" value={student.enrollment_number} />
          <InfoRow icon={User} label="Name" value={student.name} />
          <InfoRow icon={Mail} label="Email" value={student.email} />
          <InfoRow icon={Phone} label="Phone" value={student.phone} />
          <InfoRow icon={Calendar} label="Date of Birth" value={student.date_of_birth} />
          <InfoRow icon={User} label="Gender" value={student.gender} />
          <InfoRow icon={MapPin} label="Address" value={student.address} />
          <InfoRow icon={BookOpen} label="Course" value={student.course_name} />
          <InfoRow icon={GraduationCap} label="Semester" value={`Semester ${student.semester}`} />
          <InfoRow icon={Users} label="Section" value={student.section} />
        </div>
      </div>

      {/* Academic summary */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Overall Percentage</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{overallPct.toFixed(1)}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Grade</p>
            <p className={`mt-1 text-3xl font-bold ${grade.startsWith('A') ? 'text-emerald-600' : grade.startsWith('B') ? 'text-blue-600' : grade.startsWith('C') ? 'text-amber-600' : 'text-red-600'}`}>{grade}</p>
            <div className="mt-2 flex gap-1">
              {['A+','A','B+','B','C','D','F'].map(g => (
                <span key={g} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${g===grade?'bg-slate-800 text-white':'bg-slate-100 text-slate-400'}`}>{g}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Academic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Subjects" value={subjects.length.toString()} />
            <Metric label="Attendance" value={`${attendanceStats.pct}%`} color={attendanceStats.pct >= 75 ? 'text-emerald-600' : 'text-red-600'} />
            <Metric label="Internal Avg" value={`${avg(marks.map(m => Number(m.internal_marks))).toFixed(1)}`} />
            <Metric label="Assignment Avg" value={`${avg(marks.map(m => Number(m.assignment_marks))).toFixed(1)}`} />
            <Metric label="Exam Avg" value={`${avg(marks.map(m => Number(m.exam_marks))).toFixed(1)}`} />
            <Metric label="Assignments Done" value={`${submittedAssignments}/${assignments.length}`} />
          </div>
        </div>

        {/* Marks summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Subject Marks Summary</h3>
          <div className="space-y-2">
            {marks.map(m => {
              const sub = subjectMap.get(m.subject_id);
              const pct = (Number(m.internal_marks) + Number(m.assignment_marks) + Number(m.exam_marks)) / 3;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="w-20 truncate text-xs font-medium text-slate-600">{sub?.subject_code}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs font-bold text-slate-700">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
            {marks.length === 0 && <p className="text-sm text-slate-400">No marks recorded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color = 'text-slate-900' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function AttendanceTab({ attendance, subjectMap, perSubjectAttendance, stats }: {
  attendance: Attendance[]; subjectMap: Map<string, Subject>;
  perSubjectAttendance: Map<string, { present: number; total: number }>;
  stats: { total: number; present: number; absent: number; late: number; pct: number };
}) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs font-medium text-slate-500">Total Classes</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
          <p className="text-xs font-medium text-slate-500">Present</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-xs font-medium text-slate-500">Absent</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
          <p className="text-xs font-medium text-slate-500">Late</p>
        </div>
      </div>

      {/* Per-subject summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Attendance by Subject</h3>
        <div className="space-y-3">
          {Array.from(perSubjectAttendance.entries()).map(([subId, data]) => {
            const sub = subjectMap.get(subId);
            const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
            return (
              <div key={subId} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{sub?.subject_code} — {sub?.name}</p>
                  <p className="text-xs text-slate-500">{data.present}/{data.total} classes</p>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${pct>=75?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`w-12 text-right text-sm font-bold ${pct>=75?'text-emerald-600':pct>=50?'text-amber-600':'text-red-600'}`}>{pct}%</span>
              </div>
            );
          })}
          {perSubjectAttendance.size === 0 && <p className="text-sm text-slate-400">No attendance records.</p>}
        </div>
      </div>

      {/* Detailed records */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">Detailed Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-600">Date</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600">Subject</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.slice(0, 30).map(a => {
                const sub = subjectMap.get(a.subject_id);
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-4 py-2.5 text-slate-700">{sub?.subject_code} — {sub?.name}</td>
                    <td className="px-4 py-2.5">
                      <AttendanceBadge status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {attendance.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No attendance records.</p>}
        </div>
      </div>
    </div>
  );
}

function AttendanceBadge({ status }: { status: string }) {
  const config = {
    present: { Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    absent: { Icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200' },
    late: { Icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const { Icon, cls } = config[status as keyof typeof config] || config.present;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MarksTab({ marks, subjectMap, overallPct, grade }: {
  marks: Marks[]; subjectMap: Map<string, Subject>; overallPct: number; grade: string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{overallPct.toFixed(1)}%</p>
          <p className="text-xs font-medium text-slate-500">Overall</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{grade}</p>
          <p className="text-xs font-medium text-slate-500">Grade</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{avg(marks.map(m => Number(m.internal_marks))).toFixed(1)}</p>
          <p className="text-xs font-medium text-slate-500">Internal Avg</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{avg(marks.map(m => Number(m.exam_marks))).toFixed(1)}</p>
          <p className="text-xs font-medium text-slate-500">Exam Avg</p>
        </div>
      </div>

      {/* Marks table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">Subject-wise Marks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-600">Subject</th>
                <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Internal</th>
                <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Assignment</th>
                <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Exam</th>
                <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks.map(m => {
                const sub = subjectMap.get(m.subject_id);
                const pct = (Number(m.internal_marks) + Number(m.assignment_marks) + Number(m.exam_marks)) / 3;
                const g = computeGrade(pct);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{sub?.subject_code}</p>
                      <p className="text-xs text-slate-500">{sub?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{Number(m.internal_marks).toFixed(0)}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{Number(m.assignment_marks).toFixed(0)}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{Number(m.exam_marks).toFixed(0)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${pct>=75?'bg-emerald-50 text-emerald-700':pct>=50?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>
                        {pct.toFixed(0)}% · {g}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {marks.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No marks recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

function SubjectsTab({ subjects }: { subjects: Subject[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h3 className="text-sm font-bold text-slate-900">Enrolled Subjects ({subjects.length})</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {subjects.map(s => (
          <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
              {s.subject_code.slice(0, 4)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{s.name}</p>
              <p className="text-xs text-slate-500">{s.subject_code} · Semester {s.semester} · {s.credits} credits</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium text-slate-700">{s.faculty}</p>
              <p className="text-xs text-slate-400">Faculty</p>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No subjects enrolled.</p>}
      </div>
    </div>
  );
}

function AssignmentsTab({ assignments, subjectMap }: { assignments: Assignment[]; subjectMap: Map<string, Subject> }) {
  const statusConfig = {
    submitted: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Submitted' },
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending' },
    graded: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Graded' },
  };

  return (
    <div className="space-y-3">
      {assignments.map(a => {
        const sub = subjectMap.get(a.subject_id);
        const sc = statusConfig[a.status as keyof typeof statusConfig] || statusConfig.pending;
        return (
          <div key={a.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{a.title}</p>
              <p className="text-xs text-slate-500">{sub?.subject_code} — {sub?.name}</p>
              {a.due_date && <p className="mt-0.5 text-xs text-slate-400">Due: {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {a.marks !== null && <span className="text-sm font-bold text-slate-700">{Number(a.marks).toFixed(0)}/100</span>}
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
            </div>
          </div>
        );
      })}
      {assignments.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-10 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No assignments yet.</p>
        </div>
      )}
    </div>
  );
}
