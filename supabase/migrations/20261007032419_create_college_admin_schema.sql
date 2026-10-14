/*
# Create college administration schema

## Purpose
Adds tables for managing courses, subjects, students, attendance, marks, and assignments
for a college administration system. This is a single-tenant app with no auth — all data
is intentionally shared/public.

## New Tables

1. `courses` — Course catalog
   - `id` (uuid, PK)
   - `course_id` (text, unique) — human-readable course code like "BCA"
   - `name` (text) — full course name
   - `department` (text) — department offering the course
   - `duration_years` (int) — duration in years
   - `num_semesters` (int) — total number of semesters
   - `created_at` (timestamptz)

2. `subjects` — Subjects within courses
   - `id` (uuid, PK)
   - `subject_code` (text, unique) — code like "CS101"
   - `name` (text) — subject name
   - `course_id` (uuid, FK → courses.id) — which course this subject belongs to
   - `semester` (int) — which semester (1-N)
   - `credits` (int) — credit hours
   - `faculty` (text) — faculty member name
   - `created_at` (timestamptz)

3. `students` — Student profiles
   - `id` (uuid, PK)
   - `student_id` (text, unique) — institutional ID like "STU001"
   - `enrollment_number` (text, unique) — enrollment number
   - `name` (text)
   - `email` (text, unique)
   - `phone` (text)
   - `date_of_birth` (date)
   - `gender` (text) — 'male', 'female', or 'other'
   - `address` (text)
   - `course_id` (uuid, FK → courses.id) — enrolled course
   - `semester` (int) — current semester
   - `section` (text) — section like "A"
   - `photo_url` (text) — URL to student photo
   - `created_at` (timestamptz)

4. `student_subjects` — Many-to-many: subjects a student is enrolled in
   - `id` (uuid, PK)
   - `student_id` (uuid, FK → students.id ON DELETE CASCADE)
   - `subject_id` (uuid, FK → subjects.id ON DELETE CASCADE)
   - UNIQUE(student_id, subject_id)

5. `attendance` — Per-subject attendance records
   - `id` (uuid, PK)
   - `student_id` (uuid, FK → students.id ON DELETE CASCADE)
   - `subject_id` (uuid, FK → subjects.id ON DELETE CASCADE)
   - `date` (date) — the class date
   - `status` (text) — 'present', 'absent', 'late'
   - `created_at` (timestamptz)

6. `marks` — Per-subject marks
   - `id` (uuid, PK)
   - `student_id` (uuid, FK → students.id ON DELETE CASCADE)
   - `subject_id` (uuid, FK → subjects.id ON DELETE CASCADE)
   - `internal_marks` (numeric) — out of 100
   - `assignment_marks` (numeric) — out of 100
   - `exam_marks` (numeric) — out of 100
   - `created_at` (timestamptz)
   - UNIQUE(student_id, subject_id)

7. `assignments` — Per-subject assignment records
   - `id` (uuid, PK)
   - `student_id` (uuid, FK → students.id ON DELETE CASCADE)
   - `subject_id` (uuid, FK → subjects.id ON DELETE CASCADE)
   - `title` (text) — assignment title
   - `status` (text) — 'submitted', 'pending', 'graded'
   - `marks` (numeric, nullable) — marks awarded if graded
   - `due_date` (date, nullable)
   - `created_at` (timestamptz)

## Security
- RLS enabled on ALL new tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in screen — all data is intentionally shared.
- 4 separate policies per table (SELECT, INSERT, UPDATE, DELETE).

## Notes
- Existing `tasks` table is not modified.
- Indexes added on foreign keys and frequently-queried columns.
*/

-- COURSES
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text UNIQUE NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  duration_years int NOT NULL DEFAULT 3,
  num_semesters int NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_courses" ON courses;
CREATE POLICY "anon_select_courses" ON courses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_courses" ON courses;
CREATE POLICY "anon_insert_courses" ON courses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_courses" ON courses;
CREATE POLICY "anon_update_courses" ON courses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_courses" ON courses;
CREATE POLICY "anon_delete_courses" ON courses FOR DELETE TO anon, authenticated USING (true);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code text UNIQUE NOT NULL,
  name text NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester int NOT NULL,
  credits int NOT NULL DEFAULT 3,
  faculty text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
CREATE POLICY "anon_select_subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
CREATE POLICY "anon_insert_subjects" ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
CREATE POLICY "anon_update_subjects" ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
CREATE POLICY "anon_delete_subjects" ON subjects FOR DELETE TO anon, authenticated USING (true);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  enrollment_number text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  semester int NOT NULL DEFAULT 1,
  section text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- STUDENT_SUBJECTS (enrollment)
CREATE TABLE IF NOT EXISTS student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(student_id, subject_id)
);
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_student_subjects" ON student_subjects;
CREATE POLICY "anon_select_student_subjects" ON student_subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_student_subjects" ON student_subjects;
CREATE POLICY "anon_insert_student_subjects" ON student_subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_student_subjects" ON student_subjects;
CREATE POLICY "anon_update_student_subjects" ON student_subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_student_subjects" ON student_subjects;
CREATE POLICY "anon_delete_student_subjects" ON student_subjects FOR DELETE TO anon, authenticated USING (true);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_attendance" ON attendance;
CREATE POLICY "anon_select_attendance" ON attendance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_attendance" ON attendance;
CREATE POLICY "anon_insert_attendance" ON attendance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_attendance" ON attendance;
CREATE POLICY "anon_update_attendance" ON attendance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_attendance" ON attendance;
CREATE POLICY "anon_delete_attendance" ON attendance FOR DELETE TO anon, authenticated USING (true);

-- MARKS
CREATE TABLE IF NOT EXISTS marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  internal_marks numeric NOT NULL DEFAULT 0,
  assignment_marks numeric NOT NULL DEFAULT 0,
  exam_marks numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_marks" ON marks;
CREATE POLICY "anon_select_marks" ON marks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_marks" ON marks;
CREATE POLICY "anon_insert_marks" ON marks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_marks" ON marks;
CREATE POLICY "anon_update_marks" ON marks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_marks" ON marks;
CREATE POLICY "anon_delete_marks" ON marks FOR DELETE TO anon, authenticated USING (true);

-- ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  marks numeric,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_assignments" ON assignments;
CREATE POLICY "anon_select_assignments" ON assignments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_assignments" ON assignments;
CREATE POLICY "anon_insert_assignments" ON assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_assignments" ON assignments;
CREATE POLICY "anon_update_assignments" ON assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_assignments" ON assignments;
CREATE POLICY "anon_delete_assignments" ON assignments FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
