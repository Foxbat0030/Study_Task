export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  completed: boolean;
  priority: Priority;
  created_at: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority?: Priority;
}

export interface Course {
  id: string;
  course_id: string;
  name: string;
  department: string;
  duration_years: number;
  num_semesters: number;
  created_at: string;
}

export interface CourseInput {
  course_id: string;
  name: string;
  department: string;
  duration_years: number;
  num_semesters: number;
}

export interface Subject {
  id: string;
  subject_code: string;
  name: string;
  course_id: string;
  semester: number;
  credits: number;
  faculty: string;
  created_at: string;
}

export interface SubjectInput {
  subject_code: string;
  name: string;
  course_id: string;
  semester: number;
  credits: number;
  faculty: string;
}

export interface Student {
  id: string;
  student_id: string;
  enrollment_number: string;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  course_id: string | null;
  semester: number;
  section: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface StudentInput {
  student_id: string;
  enrollment_number: string;
  name: string;
  email: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  course_id?: string | null;
  semester: number;
  section?: string | null;
  photo_url?: string | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  created_at: string;
}

export interface Marks {
  id: string;
  student_id: string;
  subject_id: string;
  internal_marks: number;
  assignment_marks: number;
  exam_marks: number;
  created_at: string;
}

export interface Assignment {
  id: string;
  student_id: string;
  subject_id: string;
  title: string;
  status: 'submitted' | 'pending' | 'graded';
  marks: number | null;
  due_date: string | null;
  created_at: string;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
}

export type Page = 'tasks' | 'students' | 'courses' | 'subjects';

export type ProfileTab = 'overview' | 'attendance' | 'marks' | 'subjects' | 'assignments';

export function computeGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export function computeOverallMarks(marks: Marks[]): number {
  if (marks.length === 0) return 0;
  const total = marks.reduce(
    (sum, m) => sum + Number(m.internal_marks) + Number(m.assignment_marks) + Number(m.exam_marks),
    0
  );
  return total / (marks.length * 3);
}
