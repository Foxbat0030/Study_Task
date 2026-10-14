/*
# Create tasks table (single-tenant, no auth)

## Purpose
Stores student tasks with a title, optional description, deadline, and completion status.

## New Tables
- `tasks`
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, not null) — the task name
  - `description` (text, nullable) — optional details about the task
  - `deadline` (timestamptz, nullable) — optional due date
  - `completed` (boolean, default false) — whether the task is done
  - `created_at` (timestamptz, default now()) — creation timestamp

## Security
- Row Level Security enabled on `tasks`.
- Four separate policies (SELECT, INSERT, UPDATE, DELETE) scoped to `anon, authenticated`
  because this is a single-tenant app with no sign-in screen. All data is intentionally shared.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  deadline timestamptz,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
TO anon, authenticated USING (true);
