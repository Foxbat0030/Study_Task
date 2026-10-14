/*
# Add priority column to tasks table

## Purpose
Adds a priority level to each task so students can distinguish urgent work from less important items.

## Changes
- `tasks` table: new column `priority` (text, NOT NULL, default 'medium')
  - Valid values: 'high', 'medium', 'low'
  - Enforced via a CHECK constraint

## Security
- No security changes. Existing RLS policies already allow full CRUD for anon + authenticated.
- The new column is automatically covered by the existing policies since they grant access to all columns.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('high', 'medium', 'low'));
  END IF;
END $$;
